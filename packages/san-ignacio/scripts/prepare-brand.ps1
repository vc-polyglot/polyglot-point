$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path -Parent $PSScriptRoot
$source = 'C:\Users\Víctor\Downloads\logotipos san ignacio\Logo de tres cruces coloridas-1.png'
$destination = Join-Path $taskRoot 'assets\brand'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
Copy-Item -LiteralPath $source -Destination (Join-Path $destination 'logo-original.png') -Force
$image = [System.Drawing.Image]::FromFile($source)
try {
    foreach ($width in @(192,384)) {
        $height = [int][Math]::Round($width * $image.Height / $image.Width)
        $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        try { $graphics.Clear([System.Drawing.Color]::Transparent); $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.DrawImage($image,0,0,$width,$height); $bitmap.Save((Join-Path $destination ('logo-'+$width+'.png')),[System.Drawing.Imaging.ImageFormat]::Png) } finally { $graphics.Dispose();$bitmap.Dispose() }
    }
    foreach ($size in @(16,32,48,180,192)) {
        $width=$size; $height=[int][Math]::Round($size*$image.Height/$image.Width)
        $bitmap=[System.Drawing.Bitmap]::new($size,$size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $graphics=[System.Drawing.Graphics]::FromImage($bitmap)
        try { $graphics.Clear([System.Drawing.Color]::Transparent); $graphics.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic; $graphics.DrawImage($image,0,[int][Math]::Floor(($size-$height)/2),$width,$height); $bitmap.Save((Join-Path $destination ('icon-'+$size+'.png')),[System.Drawing.Imaging.ImageFormat]::Png) } finally { $graphics.Dispose();$bitmap.Dispose() }
    }
} finally { $image.Dispose() }
if ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath (Join-Path $destination 'logo-original.png') -Algorithm SHA256).Hash) { throw 'Logo backup mismatch.' }
Write-Output 'Institutional logo variants prepared without cropping, deformation or background replacement.'
