# DOM/CSS mismatch gate.
#
# The prototype broke in production once because app.js looked elements up by
# id (el('...')) while index.html and styles.css had drifted to different
# names. This check makes that a hard failure:
#
#   * every el('X') in app.js must exist in index.html or be created at runtime
#     by app.js itself (id="..." inside its own templates)
#   * CSS #ids that match no element are reported as STALE
#   * elements with no CSS rule are reported as UNSTYLED (informational only)
#
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File tools\domcheck.ps1
#   -> exits non-zero if an el() id is missing, writes _domcheck.txt
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
function ReadUtf8([string]$p) { [System.IO.File]::ReadAllText((Join-Path $root $p)) }

$html = ReadUtf8 'index.html'
$app  = ReadUtf8 'app.js'
$css  = ReadUtf8 'styles.css'

$htmlIds = @([regex]::Matches($html, '\bid\s*=\s*"([^"]+)"') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
$jsIds = @([regex]::Matches($app, '\bid\s*=\s*"([^"]+)"') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
$elRefs = @([regex]::Matches($app, '\bel\(''([A-Za-z0-9_-]+)''\)') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)

# CSS #ids, minus #hex colours such as #fff / #1d1409 / #00000000.
$cssIds = @([regex]::Matches($css, '#([A-Za-z][A-Za-z0-9_-]*)') |
    ForEach-Object { $_.Groups[1].Value } |
    Where-Object { $_ -notmatch '^[0-9a-fA-F]{3,4}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$' } |
    Sort-Object -Unique)

$known    = @($htmlIds + $jsIds)
$missing  = @($elRefs  | Where-Object { $known  -notcontains $_ })
$stale    = @($cssIds  | Where-Object { $htmlIds -notcontains $_ })
$unstyled = @($htmlIds | Where-Object { $cssIds -notcontains $_ })
$fail     = $false

$out = @()
$out += "el() references       : $($elRefs.Count)"
$out += "ids in index.html     : $($htmlIds.Count)"
$out += "ids created in app.js : $($jsIds.Count)"
$out += "css #ids (not colours): $($cssIds.Count)"
$out += "MISSING IDS (el() with no element anywhere):"
if (-not $missing) { $out += "  (none)" } else { $out += ($missing | ForEach-Object { "  $_" }); $fail = $true }
$out += "STALE CSS (styled but no element in index.html):"
if (-not $stale) { $out += "  (none)" } else { $out += ($stale | ForEach-Object { "  $_" }) }
$out += "UNSTYLED (element with no css rule - informational):"
if (-not $unstyled) { $out += "  (none)" } else { $out += ($unstyled | ForEach-Object { "  $_" }) }

$out += if ($fail) { "RESULT: FAIL" } else { "RESULT: OK" }
$out | Set-Content -Path (Join-Path $root '_domcheck.txt') -Encoding UTF8
Write-Host ($out -join "`n")
if ($fail) { exit 1 }
