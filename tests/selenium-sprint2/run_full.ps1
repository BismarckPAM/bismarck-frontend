param(
    [switch]$Headless
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env.selenium")) {
    Write-Host "Missing .env.selenium. Run this first:" -ForegroundColor Red
    Write-Host "  .\setup_env.ps1" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path ".venv")) {
    py -m venv .venv
}

& .\.venv\Scripts\python.exe -m pip install --upgrade pip
& .\.venv\Scripts\python.exe -m pip install -r requirements.txt

if ($Headless) {
    $env:SELENIUM_HEADLESS = "true"
}

New-Item -ItemType Directory -Force -Path "artifacts\screenshots" | Out-Null

Write-Host "`n=== PRE-FLIGHT (diagnostic) ===" -ForegroundColor Cyan
& .\.venv\Scripts\python.exe scripts\preflight.py
if ($LASTEXITCODE -ne 0) {
    Write-Warning "Preflight found a deployed-environment problem. Selenium will continue so the defect is captured in the HTML report/screenshots."
}

Write-Host "`n=== FULL SPRINT 2 SELENIUM SUITE ===" -ForegroundColor Cyan
& .\.venv\Scripts\python.exe -m pytest -v `
    --html=artifacts\Bismarck_Sprint2_Selenium_Report.html `
    --self-contained-html

$exitCode = $LASTEXITCODE
Write-Host "`nReport: $PSScriptRoot\artifacts\Bismarck_Sprint2_Selenium_Report.html" -ForegroundColor Green
Write-Host "Screenshots: $PSScriptRoot\artifacts\screenshots" -ForegroundColor Green
exit $exitCode
