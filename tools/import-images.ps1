# ---------------------------------------------------------------------------
# ArtRace image importer
#
# Reads the master pictures, writes web-sized JPEG derivatives into images/
# and emits images.js (window.ART_IMAGES = {...}) so app.js can look a picture
# up by slug instead of guessing file names.
#
# Masters are only read, never modified. Re-running is idempotent.
#
# Three master folders exist today and each gets its own slug prefix, so that
# orgGameImages\berlin.jpg can never collide with the illustration Berlin.jpg:
#
#   new\           city + trade illustrations   ->  <slug>.jpg        (role city)
#   hdArtwork\     upscaled, text-free plates   ->  hd-<slug>.jpg     (role scene)
#   orgGameImages\ raw game screenshots         ->  orig-<slug>.jpg   (role reference)
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\import-images.ps1
#   powershell ... -File tools\import-images.ps1 -IncludeOriginals
#   powershell ... -File tools\import-images.ps1 -Source D:\masters -MaxWidth 1920
# ---------------------------------------------------------------------------
param(
    [string]$Source       = 'D:\Projekte\Ren\ArtRace3Artwork\new',
    [string]$SceneSource  = 'D:\Projekte\Ren\ArtRace3Artwork\hdArtwork',
    [string]$OriginSource = 'D:\Projekte\Ren\ArtRace3Artwork\orgGameImages',
    [switch]$IncludeOriginals,
    [int]   $MaxWidth = 1600,
    [int]   $Quality  = 82
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root   = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'images'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$sources = @(
    @{ Path = $Source;      Prefix = '';      Role = 'city'  },
    @{ Path = $SceneSource; Prefix = 'hd-';   Role = 'scene' }
)
if ($IncludeOriginals) {
    $sources += @{ Path = $OriginSource; Prefix = 'orig-'; Role = 'reference' }
}
foreach ($s in $sources) {
    if (-not (Test-Path -LiteralPath $s.Path)) { throw "Source folder not found: $($s.Path)" }
}

# Everything we intend to convert, resolved up front so the report can state
# the true size of the masters before a single byte is written.
$plates = @()
foreach ($s in $sources) {
    $plates += @(Get-ChildItem -LiteralPath $s.Path -File |
        Where-Object { $_.Extension -in '.jpg', '.jpeg', '.png' } |
        Sort-Object Name |
        ForEach-Object { [pscustomobject]@{ File = $_; Prefix = $s.Prefix; Role = $s.Role; Folder = $s.Path } })
}
# Measured here, not after the loop: reading it later is what produced the
# nonsense "masters were 0.0002 MB" line in the first version of this script.
$srcTotalBytes = ($plates | ForEach-Object { $_.File.Length } | Measure-Object -Sum).Sum

# one JPEG encoder configured with the requested quality
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
             Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)

# "Gemini_Generated_Image (1).jpg" -> "gemini-generated-image-1"
function Get-Slug([string]$name) {
    $s = $name.ToLowerInvariant()
    $s = [regex]::Replace($s, '[()\s_]+', '-')
    $s = [regex]::Replace($s, '[^a-z0-9-]', '')
    $s = [regex]::Replace($s, '-{2,}', '-')
    return $s.Trim('-')
}

# Which slugs are already game ids? Drives the report and the city wiring.
$cityIds = @(); $artistIds = @(); $workIds = @()
$dataJs = Join-Path $root 'data.js'
if (Test-Path -LiteralPath $dataJs) {
    $json = (Get-Content -LiteralPath $dataJs -Raw) `
        -replace '^/\*[\s\S]*?\*/\s*', '' `
        -replace '^\s*window\.ART_DATA\s*=\s*', '' `
        -replace ';\s*$', ''
    $data      = $json | ConvertFrom-Json
    $cityIds   = @($data.cities.id)
    $artistIds = @($data.artists.id)
    $workIds   = @($data.works.id)
}

# --- convert --------------------------------------------------------------
$manifest  = [ordered]@{}
$log       = @()
$matched   = @()
$unmatched = @()
$dupes     = @()
$perRole   = [ordered]@{}

foreach ($plate in $plates) {
    $f        = $plate.File
    $slug     = $plate.Prefix + (Get-Slug $f.BaseName)
    $destName = "$slug.jpg"
    $dest     = Join-Path $outDir $destName

    if ($manifest.Contains($slug)) { $dupes += "$($f.Name) -> $slug (already used)"; continue }

    $img = [System.Drawing.Image]::FromFile($f.FullName)
    $srcW = $img.Width; $srcH = $img.Height
    try {
        $ratio = [Math]::Min(1.0, $MaxWidth / [double]$srcW)
        $w = [int][Math]::Round($srcW * $ratio)
        $h = [int][Math]::Round($srcH * $ratio)
        $bmp = New-Object System.Drawing.Bitmap($w, $h)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.DrawImage($img, 0, 0, $w, $h)
        $g.Dispose()
        $bmp.Save($dest, $jpegCodec, $encParams)
        $bmp.Dispose()
    } finally {
        $img.Dispose()
    }

    $bytes  = (Get-Item -LiteralPath $dest).Length
    $idHits = @()
    if ($cityIds   -contains $slug) { $idHits += 'city'   }
    if ($artistIds -contains $slug) { $idHits += 'artist' }
    if ($workIds   -contains $slug) { $idHits += 'work'   }

    $manifest[$slug] = [ordered]@{
        file   = "images/$destName"
        width  = $w
        height = $h
        bytes  = $bytes
        role   = $plate.Role
        source = $f.Name
        folder = $plate.Folder
        ids    = $idHits
    }

    if (-not $perRole.Contains($plate.Role)) { $perRole[$plate.Role] = 0 }
    $perRole[$plate.Role]++

    if ($idHits.Count) { $matched += "$slug ($($idHits -join ','))" } else { $unmatched += $slug }

    $log += ("{0,-42} {1,4}x{2,-4} {3,6:N0}KB -> {4,4}x{5,-4} {6,6:N0}KB  {7,-6} {8}" -f `
        $slug, $srcW, $srcH, ($f.Length / 1KB), $w, $h, ($bytes / 1KB),
        $plate.Role, $(if ($idHits.Count) { 'id-match: ' + ($idHits -join ',') } else { '-' }))
}

# --- write images.js + report --------------------------------------------
$payload = [ordered]@{
    meta = [ordered]@{
        generated = (Get-Date).ToString('yyyy-MM-dd HH:mm')
        maxWidth  = $MaxWidth
        quality   = $Quality
        count     = $manifest.Count
        folders   = @($sources | ForEach-Object { "$($_.Role) <- $($_.Path)" })
    }
    images = $manifest
}
$jsonOut = ConvertTo-Json -InputObject $payload -Depth 6
$utf8    = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $root 'images.js'),
    "/* Generated by tools/import-images.ps1 - do not edit by hand. */`nwindow.ART_IMAGES = $jsonOut;`n", $utf8)

$total = 0
foreach ($k in $manifest.Keys) { $total += $manifest[$k].bytes }

$withPic    = @($cityIds | Where-Object { $manifest.Contains($_) } | Sort-Object)
$withoutPic = @($cityIds | Where-Object { -not $manifest.Contains($_) } | Sort-Object)

$report  = @()
$report += "images written : $($manifest.Count) -> images/"
foreach ($role in $perRole.Keys) {
    $report += ("  {0,-9} : {1,3} files  <- {2}" -f $role, $perRole[$role],
        (($sources | Where-Object { $_.Role -eq $role } | ForEach-Object { $_.Path }) -join ', '))
}
$report += ("total size     : {0:N1} MB (masters were {1:N1} MB, saved {2:N0}%)" -f `
    ($total / 1MB), ($srcTotalBytes / 1MB), (100 * (1 - $total / $srcTotalBytes)))
$report += "matched to ids : " + (($matched | Sort-Object) -join ', ')
$report += "not in data.js : " + (($unmatched | Sort-Object) -join ', ')
$report += ''
$report += "cities with a picture    ($($withPic.Count)/$($cityIds.Count)) : " + ($withPic -join ', ')
$report += "cities without a picture ($($withoutPic.Count)/$($cityIds.Count)) : " + ($withoutPic -join ', ')
if ($dupes.Count) { $report += "duplicate slugs: " + ($dupes -join '; ') }
$report += ''
$report += $log

$reportText = $report -join "`r`n"
[System.IO.File]::WriteAllText((Join-Path $root 'images-report.txt'), $reportText + "`r`n", $utf8)
Write-Output $reportText

