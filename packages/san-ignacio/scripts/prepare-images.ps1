$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $taskRoot 'public\img'
$imageRoot = Join-Path $taskRoot 'assets\images'
$reportRoot = Join-Path $taskRoot 'reports'
New-Item -ItemType Directory -Path $imageRoot,$reportRoot -Force | Out-Null
$metadata = @{}
$inventory = @()
$encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
foreach ($file in (Get-ChildItem -LiteralPath $sourceRoot -File -Recurse)) {
    $hashBefore = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    $image = [System.Drawing.Image]::FromFile($file.FullName)
    try {
        $rawWidth = $image.Width; $rawHeight = $image.Height; $orientation = 1
        if ($image.PropertyIdList -contains 274) { $orientation = [BitConverter]::ToUInt16($image.GetPropertyItem(274).Value, 0) }
        $rotation = switch ($orientation) {
            2 { [System.Drawing.RotateFlipType]::RotateNoneFlipX }
            3 { [System.Drawing.RotateFlipType]::Rotate180FlipNone }
            4 { [System.Drawing.RotateFlipType]::Rotate180FlipX }
            5 { [System.Drawing.RotateFlipType]::Rotate90FlipX }
            6 { [System.Drawing.RotateFlipType]::Rotate90FlipNone }
            7 { [System.Drawing.RotateFlipType]::Rotate270FlipX }
            8 { [System.Drawing.RotateFlipType]::Rotate270FlipNone }
            default { [System.Drawing.RotateFlipType]::RotateNoneFlipNone }
        }
        # Normalize the original pixels exactly once, before deriving any size.
        $image.RotateFlip($rotation)
        $derivatives = @()
        foreach ($size in @(640,1280,1920)) {
            if ($size -eq 1920 -and $image.Width -le 1280) { continue }
            $width = [Math]::Min($size, $image.Width)
            $height = [int][Math]::Round([double]$image.Height * $width / $image.Width)
            # A new bitmap carries no stale EXIF orientation: browsers cannot rotate twice.
            $bitmap = [System.Drawing.Bitmap]::new($width, $height)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([System.Drawing.Color]::White)
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($image, 0, 0, $width, $height)
                $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
                $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]82)
                $name = $file.BaseName + '-' + $size + '.jpg'
                $destination = Join-Path $imageRoot $name
                $bitmap.Save($destination, $encoder, $parameters)
                $metadata[$name] = @{ width=$width; height=$height; bytes=(Get-Item -LiteralPath $destination).Length }
                $derivatives += '/assets/images/' + $name
                $parameters.Dispose()
            } finally { $graphics.Dispose(); $bitmap.Dispose() }
        }
        $inventory += @{ original=$file.FullName; filename=$file.Name; originalSha256=$hashBefore; exifOrientation=$orientation; rawWidth=$rawWidth; rawHeight=$rawHeight; normalizedWidth=$image.Width; normalizedHeight=$image.Height; correction=if($orientation -ne 1){'EXIF normalized before resizing; fresh bitmap without orientation metadata'}else{'No orientation correction required'}; corrected=($orientation -ne 1); derivatives=$derivatives }
    } finally { $image.Dispose() }
    if ((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash -ne $hashBefore) { throw 'An original was modified.' }
}
$metadata | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $taskRoot 'assets\image-metadata.json') -Encoding utf8NoBOM
$inventory | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $reportRoot 'photo-inventory.json') -Encoding utf8NoBOM
Write-Output ('Originals checked: ' + $inventory.Count + '; corrected: ' + ($inventory | Where-Object corrected).Count + '; derivatives: ' + $metadata.Count)
