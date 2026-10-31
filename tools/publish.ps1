# Publishes the repository: makes it public and enables GitHub Pages on main.
# Run only after the asset licensing question in ASSETS.md is settled.
param([string]$Repo = "gregorminton-rgb/theartrace")

$ErrorActionPreference = "Stop"

Write-Host "Making $Repo public..." -ForegroundColor Cyan
gh repo edit $Repo --visibility public --accept-visibility-change-consequences
if ($LASTEXITCODE -ne 0) { throw "gh repo edit failed" }

Write-Host "Enabling GitHub Pages on branch main, path / ..." -ForegroundColor Cyan
gh api -X POST "repos/$Repo/pages" -f "source[branch]=main" -f "source[path]=/"
if ($LASTEXITCODE -ne 0) { throw "enabling Pages failed" }

$owner, $name = $Repo.Split("/")
$url = "https://$owner.github.io/$name/"
Write-Host "Waiting for the first build..." -ForegroundColor Cyan
Start-Sleep -Seconds 40

try {
  $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30
  Write-Host "Live: $url ($($r.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "Pages is enabled but not answering yet: $url" -ForegroundColor Yellow
  Write-Host "Check https://github.com/$Repo/actions for the deploy run." -ForegroundColor Yellow
}