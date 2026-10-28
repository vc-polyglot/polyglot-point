param([string]$PublicDirectory = (Join-Path $PSScriptRoot '../public'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$mediaDirectory = Join-Path $PublicDirectory 'media'
New-Item -ItemType Directory -Path $mediaDirectory -Force | Out-Null
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
function Write-WebImage([string]$Source, [string]$Name, [int]$MaxEdge, [long]$Quality) {
    $image = [System.Drawing.Image]::FromFile((Join-Path $PublicDirectory $Source))
    try {
        $scale = [Math]::Min([double]1, ([double]$MaxEdge / [Math]::Max($image.Width, $image.Height)))
        $width = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
        $height = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))
        $bitmap = [System.Drawing.Bitmap]::new($width, $height)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
                $graphics.DrawImage($image, 0, 0, $width, $height)
            } finally { $graphics.Dispose() }
            $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
            try {
                $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, $Quality)
                $destination = Join-Path $mediaDirectory $Name
                $bitmap.Save($destination, $codec, $parameters)
                return @{ src = "/media/$Name"; width = $width; height = $height; bytes = (Get-Item -LiteralPath $destination).Length }
            } finally { $parameters.Dispose() }
        } finally { $bitmap.Dispose() }
    } finally { $image.Dispose() }
}
$manifest = [ordered]@{}
$manifest.hero = Write-WebImage 'Victor_Contreras_Director.jpg' 'director-960.jpg' 960 88
$manifest.bio = Write-WebImage 'victor-bio.jpg' 'organo-1200.jpg' 1200 85
$manifest.orchestra = Write-WebImage 'arriba_abajo_barroca_2023.jpg' 'barroca-1400.jpg' 1400 84
$manifest.gallery = @()
foreach ($number in 1..11) {
    $name = 'g{0:00}' -f $number
    $manifest.gallery += @{
        original = "galeria/$name.jpg"
        thumbnail = (Write-WebImage "galeria/$name.jpg" "$name-640.jpg" 640 82)
        full = (Write-WebImage "galeria/$name.jpg" "$name-1600.jpg" 1600 86)
    }
}
$manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $mediaDirectory 'manifest.json') -Encoding utf8NoBOM
Write-Output ('Generated {0} JPEG derivatives; originals preserved.' -f (3 + 2 * $manifest.gallery.Count))
