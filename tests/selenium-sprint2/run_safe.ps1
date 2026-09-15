param(
    [switch]$Headless
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".env.selenium")) {
    Write-Host "Missing .env.selenium. Run .\setup_env.ps1 first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path ".venv")) {
    py -m venv .venv
}

& .\.venv\Scripts\python.exe -m pip install -r requirements.txt

if ($Headless) {
    $env:SELENIUM_HEADLESS = "true"
}

New-Item -ItemType Directory -Force -Path "artifacts\screenshots" | Out-Null

& .\.venv\Scripts\python.exe -m pytest -v -m "not destructive" `
    --html=artifacts\Bismarck_Sprint2_Selenium_SAFE_Report.html `
    --self-contained-html

exit $LASTEXITCODE
