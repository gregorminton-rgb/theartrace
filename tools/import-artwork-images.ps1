# ---------------------------------------------------------------------------
# ArtRace artwork image importer
#
# Reads the master pictures in D:\Projekte\Ren\ArtRace3Artwork\Bilder, whose
# names carry "Artist - Title (year)", and maps them onto the works in
# data.js. Writes web-sized JPEGs into images/art/ and emits
# artwork-images.js (window.ART_ARTWORK_IMAGES = { workId: {file,...} }).
#
# Mapping rules, in order (first hit wins, an artist must exist in data.js):
#   1. exact title match        -> that work
#   2. title is a quote of a work title ("The Birth of Venus" -> "... study")
#   3. artist match             -> the artist's most representative work, i.e.
#                                 highest rarity, then closest year
#
# Masters are only read, never modified. Re-running is idempotent.
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\import-artwork-images.ps1
#   powershell ... -File tools\import-artwork-images.ps1 -MaxWidth 900 -Quality 80
# ---------------------------------------------------------------------------
param(
    [string]$Source   = 'D:\Projekte\Ren\ArtRace3Artwork\Bilder',
    [int]   $MaxWidth = 900,
    [int]   $Quality  = 80
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $Source)) { throw "Source folder not found: $Source" }
$root   = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'images\art'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
             Where-Object { $_.MimeType -eq 'image/jpeg' }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [int64]$Quality)

# --- game data ------------------------------------------------------------
$dataJs = Join-Path $root 'data.js'
$json = (Get-Content -LiteralPath $dataJs -Raw) `
    -replace '^/\*[\s\S]*?\*/\s*', '' `
    -replace '^\s*window\.ART_DATA\s*=\s*', '' `
    -replace ';\s*$', ''
$data    = $json | ConvertFrom-Json
$artists = @($data.artists)
$works   = @($data.works)

# Artists that are already used by a big plate; leftovers compete on rarity.
$claimed = @{}

# Explicit loops instead of Where-Object chains on purpose: PowerShell 5.1
# silently skips the script block of a Where-Object call once the script has
# hit one non-terminating error in an unrelated statement, which made this
# matcher return "nothing found" for every plate with no visible cause.
# Case-, accent- and punctuation-insensitive key. data.js spells artists
# without diacritics ("Velazquez", "Cezanne"), the plate filenames spell them
# with ("Velazquez" -> a-acute), so both sides get decomposed and stripped.
# Umlauts are transliterated in data.js ("Albrecht Duerer", "Muenchen"), while
# the plates spell them as umlauts. Fold those before comparing.
$umlauts = @{ 'ä' = 'ae'; 'ö' = 'oe'; 'ü' = 'ue'; 'Ä' = 'Ae'; 'Ö' = 'Oe'; 'Ü' = 'Ue'; 'ß' = 'ss' }

function Get-Key([string]$s) {
    if (-not $s) { return '' }
    foreach ($k in $umlauts.Keys) { $s = $s.Replace($k, $umlauts[$k]) }
    $d = $s.Normalize([System.Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $d.ToCharArray()) {
        if ([System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne 'NonSpacingMark') { [void]$sb.Append($ch) }
    }
    return ($sb.ToString() -replace '[^\p{L}\p{Nd}]', '').ToLowerInvariant()
}

# Plate titles are German, data.js titles are English. Each entry maps the
# German title of the photographed original to the work it stands in for here.
# Marked 'alias' in the manifest so the UI can label them as stand-ins.
$titleAliasesRaw = @{
    'Die Geburt der Venus'                = 'botticelli_venus_study'
    'Die Kartenspieler'                   = 'cezanne_card_players'
    'Die Tanzklasse'                      = 'degas_the_star'
    'Das Fruhstuck im Grunen'             = 'manet_peonies'
    'Der 3. Mai 1808'                     = 'goya_the_colossus'
    'Der Kuss'                            = 'klimt_the_kiss_study'
    'Das Madchen mit dem Perlenohrring'   = 'vermeer_pearl_earring_copy'
    'Die Nachtwache'                      = 'rembrandt_night_watch_sketch'
    'Die Sternennacht'                    = 'van_gogh_starry_night_study'
    'Feldhase'                            = 'durer_young_hare_after'
    'Bal au moulin de la Galette'         = 'renoir_moulin_galette'
    'Las Meninas'                         = 'velazquez_meninas_bozzetto'
    'Die Fighting Temeraire'              = 'turner_temeraire'
}

# Normalised once: a hashtable literal keyed with spaces does not answer
# ContainsKey('dienachtwache'), it answers ContainsKey('die nachtwache').
$titleAliases = @{}
foreach ($k in $titleAliasesRaw.Keys) { $titleAliases[(Get-Key $k)] = $titleAliasesRaw[$k] }

function Get-Artist([string]$name) {
    $key = Get-Key $name
    if (-not $key) { return $null }
    foreach ($a in $artists) {
        if ((Get-Key $a.name) -eq $key -or (Get-Key $a.id) -eq $key) { return $a }
    }
    # "Francisco de Goya" vs "Francisco Goya", "Michelangelo Merisi da
    # Caravaggio" vs "Caravaggio": compare the surname, ignoring name particles.
    $surname = Get-Surname $name
    if (-not $surname) { return $null }
    foreach ($a in $artists) {
        if ((Get-Surname $a.name) -eq $surname) { return $a }
    }
    return $null
}

function Get-Surname([string]$name) {
    $stop = 'van', 'von', 'de', 'da', 'di', 'del', 'der', 'le', 'la', 'du'
    $w = @()
    foreach ($t in ($name -split '[\s\-]+')) {
        if ($t -and ($stop -notcontains $t.ToLowerInvariant())) { $w += $t }
    }
    if ($w.Count -lt 2) { return $null }
    $s = Get-Key $w[$w.Count - 1]
    if ($s.Length -lt 4) { return $null }
    return $s
}

function Get-TitleParts([string]$baseName) {
    # "Jan Vermeer - Das Maedchen mit dem Perlenohrring" | "(ca. 1485)"
    $year = $null
    $parsed = [regex]::Match($baseName, '\(ca\.?\s*(\d{3,4})\)|\((\d{3,4})\)\s*$')
    if ($parsed.Success) {
        $year = if ($parsed.Groups[1].Success) { [int]$parsed.Groups[1].Value } else { [int]$parsed.Groups[2].Value }
    }
    $rest = [regex]::Replace($baseName, '\s*\([^)]*\)\s*$', '')
    $parts = $rest -split '\s+[\u2013\u2014-]\s+', 2
    if ($parts.Count -lt 2) { return $null }
    [pscustomobject]@{
        Artist = $parts[0].Trim()
        Title  = ($parts[1].Trim() -replace '\s*\([^)]*\)', '').Trim()
        Year   = $year
    }
}

function Get-Slug([string]$s) {
    $v = $s.ToLowerInvariant()
    $v = [regex]::Replace($v, '[^\p{L}\p{Nd}]+', '-')
    return $v.Trim('-')
}

function Get-WorkById([string]$id) {
    foreach ($w in $works) { if ($w.id -eq $id) { return $w } }
    return $null
}

function Find-Match($parts) {
    $artist = Get-Artist $parts.Artist
    $want = Get-Key $parts.Title

    # A plate whose original is not in the dataset stands in for a listed
    # work. Checked before the artist lookup, because some originals belong to
    # painters that are only partly represented ("Feldhase" -> Duerer).
    if ($titleAliases.ContainsKey($want)) {
        $w = Get-WorkById $titleAliases[$want]
        if ($w) { return [pscustomobject]@{ Work = $w; Artist = $artist; How = 'alias' } }
    }
    if (-not $artist) { return $null }

    $mine = @()
    foreach ($w in $works) { if ($w.artistId -eq $artist.id) { $mine += $w } }

    # 1. exact title
    foreach ($w in $mine) {
        if ((Get-Key $w.title) -eq $want) {
            return [pscustomobject]@{ Work = $w; Artist = $artist; How = 'title' }
        }
    }

    # 2. the plate quotes a work title: "The Birth of Venus" vs
    #    "The Birth of Venus, tempera study"
    $quoted = @()
    foreach ($w in $mine) {
        $t = Get-Key ($w.title -split ',\s*')[0]
        if ($t -eq $want -or $want.StartsWith($t) -or $t.StartsWith($want)) { $quoted += $w }
    }
    if ($quoted.Count) {
        $quoted = @($quoted | Sort-Object -Property title)
        return [pscustomobject]@{ Work = $quoted[0]; Artist = $artist; How = 'quote' }
    }

    return $null
}

# --- convert + map -------------------------------------------------------
$manifest  = [ordered]@{}
$log       = @()
$unmatched = @()
$missing   = @()
$plates    = @(Get-ChildItem -LiteralPath $Source -File |
    Where-Object { $_.Extension -in '.jpg', '.jpeg', '.png' } | Sort-Object Name)
$srcBytes  = ($plates | ForEach-Object { $_.Length } | Measure-Object -Sum).Sum

foreach ($f in $plates) {
    $parts = Get-TitleParts $f.BaseName
    if (-not $parts) { $unmatched += "$($f.Name) (kein 'Kuenstler - Titel'-Muster)"; continue }

    $hit = Find-Match $parts
    if (-not $hit) { $unmatched += "$($f.Name) (kein passender Kuenstler im Datensatz)"; continue }

    # one picture per work; an exact title hit always beats an artist hit
    if ($manifest.Contains($hit.Work.id)) { $unmatched += "$($f.Name) (Werk bereits bebildert)"; continue }
    if ($hit.How -ne 'title' -and $hit.How -ne 'quote' -and $hit.How -ne 'alias') {
        # artist fallback: prefer the artist's rarest work, closest in year
        $year = $parts.Year
        $cand = @()
        foreach ($w in $works) { if ($w.artistId -eq $hit.Artist.id) { $cand += $w } }
        $best = @($cand | Sort-Object -Property @{ Expression = 'rarity'; Descending = $true },
                                             @{ Expression = { if ($year) { [Math]::Abs($_.yearCreated - $year) } else { 0 } } }) |
            Select-Object -First 1
        if ($manifest.Contains($best.id)) { $unmatched += "$($f.Name) (Werk bereits bebildert)"; continue }
        $hit = [pscustomobject]@{ Work = $best; Artist = $hit.Artist; How = 'artist' }
    }

    $destName = (Get-Slug $hit.Work.id) + '.jpg'
    $dest     = Join-Path $outDir $destName
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
        $g.DrawImage($img, 0, 0, $w, $h)
        $g.Dispose()
        $bmp.Save($dest, $jpegCodec, $encParams)
        $bmp.Dispose()
    } finally { $img.Dispose() }

    $bytes = (Get-Item -LiteralPath $dest).Length
    $manifest[$hit.Work.id] = [ordered]@{
        file   = "images/art/$destName"
        width  = $w
        height = $h
        bytes  = $bytes
        source = $f.Name
        how    = $hit.How
    }
    $log += ("{0,-30} {1,-8} <- {2}" -f $hit.Work.id, $hit.How, $f.Name)
}

# works that ended up without a picture, for the report only
$covered = @($manifest.Keys)
$noPic   = @($works | Where-Object { $covered -notcontains $_.id } | ForEach-Object { $_.id })

$payload = [ordered]@{
    meta = [ordered]@{
        generated = (Get-Date).ToString('yyyy-MM-dd HH:mm')
        maxWidth  = $MaxWidth
        quality   = $Quality
        count     = $manifest.Count
        folder    = $Source
        note      = 'Auction/scene plates in the folder are not artworks and are skipped.'
    }
    images = $manifest
}
$jsonOut = ConvertTo-Json -InputObject $payload -Depth 6
$utf8    = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $root 'artwork-images.js'),
    "/* Generated by tools/import-artwork-images.ps1 - do not edit by hand. */`nwindow.ART_ARTWORK_IMAGES = $jsonOut;`n", $utf8)

$total = 0
foreach ($k in $manifest.Keys) { $total += $manifest[$k].bytes }
$report  = @()
$report += "artwork images : $($manifest.Count)/$($works.Count) works in images/art/"
$report += ("total size     : {0:N1} MB (masters were {1:N1} MB)" -f ($total / 1MB), ($srcBytes / 1MB))
$report += "not mapped     : " + ($unmatched -join '; ')
$report += "works w/o image: " + (($noPic | Sort-Object) -join ', ')
$report += ''
$report += $log
$reportText = $report -join "`r`n"
[System.IO.File]::WriteAllText((Join-Path $root 'artwork-images-report.txt'), $reportText + "`r`n", $utf8)
Write-Output $reportText
