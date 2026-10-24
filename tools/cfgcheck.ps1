$ErrorActionPreference = 'Stop'
Set-Location (Join-Path (Split-Path $PSScriptRoot -Parent) '')
$raw = Get-Content 'data.js' -Raw
$json = $raw -replace '^\s*/\*[^>]*?\*/\s*', '' -replace '(?s)^.*?window\.ART_DATA\s*=\s*', '' -replace ';\s*$', ''
$data = $json | ConvertFrom-Json
$econ = $data.economy
$names = $econ.PSObject.Properties.Name

# Keys the browser prototype invents on purpose. They are declared once, in the
# WEB_ONLY_DEFAULTS block of web/engine.js, and merged into CFG at load time, so
# reading them is legitimate. Anything else read through CFG must come from the
# Unity export - that is the whole point of this check.
$engineRaw = Get-Content 'engine.js' -Raw
$webOnly = @()
foreach ($blockName in 'WEB_ONLY_DEFAULTS', 'WEB_ONLY_DERIVED') {
  $block = [regex]::Match($engineRaw, "$blockName\s*=\s*\{(?<body>.*?)\};", 'Singleline')
  if ($block.Success) {
    $webOnly += @([regex]::Matches($block.Groups['body'].Value, '(?m)^\s*([A-Za-z0-9_]+)\s*:') |
      ForEach-Object { $_.Groups[1].Value })
  }
}
$webOnly = @($webOnly | Sort-Object -Unique)

$srcFiles = @('engine.js') + @(Get-ChildItem -Path . -Filter 'app-*.js' |
  Where-Object { $_.Name -ne 'app.js' } | ForEach-Object { $_.Name })
$refs = Select-String -Path $srcFiles -Pattern 'CFG\.([A-Za-z0-9_]+)' -AllMatches
$keys = @()
foreach ($m in $refs) { foreach ($g in $m.Matches) { $keys += $g.Groups[1].Value } }
$keys = $keys | Sort-Object -Unique

$out = @()
$fail = @()
$out += "economy keys in data.js : $($names.Count)"
$out += "CFG.* references       : $($keys.Count)"
$out += "declared web-only      : $($webOnly.Count)  ($($webOnly -join ', '))"

$missing = @($keys | Where-Object { ($names -notcontains $_) -and ($webOnly -notcontains $_) })
$out += "MISSING (read through CFG, neither exported nor declared):"
if (-not $missing) { $out += "  (none)" } else { $out += ($missing | ForEach-Object { "  $_" }); $fail += "missing" }

$supplied = @($webOnly | Where-Object { $names -contains $_ })
$out += "STALE DEFAULTS (EconomyConfig.cs grew the field, drop it from WEB_ONLY_DEFAULTS):"
if (-not $supplied) { $out += "  (none)" } else { $out += ($supplied | ForEach-Object { "  $_" }); $fail += "stale" }

$dead = @($webOnly | Where-Object { $keys -notcontains $_ })
$out += "UNUSED DEFAULTS (declared but no code reads them):"
if (-not $dead) { $out += "  (none)" } else { $out += ($dead | ForEach-Object { "  $_" }) }

$unused = @($names | Where-Object { $keys -notcontains $_ })
$out += "economy keys never referenced by the web app (informational):"
if (-not $unused) { $out += "  (none)" } else { $out += ($unused | ForEach-Object { "  $_" }) }

$out += "spot checks:"
$out += "  startingMoney        = $($econ.startingMoney)"
$out += "  targetNetWorth       = $($econ.targetNetWorth)"
$out += "  careerLengthDays     = $($econ.careerLengthDays)"
$out += "  dealerMargin         = $($econ.dealerMargin)"
$out += "  restorationCostPerHundredth = $($econ.restorationCostPerHundredth)"
$out += "  maxLoanReputationMultiplier = $($econ.maxLoanReputationMultiplier)"

# LoanCeiling parity: web/engine.js must reproduce EconomyConfig.LoanCeiling.
# Every operand is coerced to [double] on purpose - PowerShell otherwise binds
# Math.Max(int,int) and truncates the 0..1 ramp to a step function.
function UnityCeiling([double]$rep) {
  $base = [double]$econ.baseLoanCeiling
  $mult = [double]$econ.maxLoanReputationMultiplier
  $repForMax = [double]$econ.reputationForMaxLoan
  $t = [Math]::Min([double]1, [Math]::Max([double]0, $rep / [Math]::Max([double]1, $repForMax)))
  return [int][Math]::Round($base * (1 + ($mult - 1) * $t), [MidpointRounding]::AwayFromZero)
}
$out += "loan ceiling (Unity formula, for parity with engine.js loanCeiling):"
foreach ($r in 0, 15, 25, 40, 80, 120, 200) { $out += "  rep {0,3} -> {1}" -f $r, (UnityCeiling $r) }

$out += if ($fail) { "RESULT: FAIL ($($fail -join ', '))" } else { "RESULT: OK" }
$out | Set-Content -Path '_cfgcheck.txt' -Encoding UTF8
Write-Host ($out -join "`n")
if ($fail) { exit 1 }
