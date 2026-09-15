param(
    [string]$JMeterHome = "C:\Tools\apache-jmeter-5.6.3"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $env:QA_ADMIN_EMAIL -or -not $env:QA_ADMIN_PASSWORD) {
    Write-Host "Credentials are not loaded. Run .\setup_env.ps1 in this PowerShell window first." -ForegroundColor Red
    exit 1
}

$jmeter = Join-Path $JMeterHome "bin\jmeter.bat"
if (-not (Test-Path $jmeter)) {
    Write-Host "JMeter not found at: $jmeter" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force "artifacts" | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"

$jtl = "artifacts\smoke_$stamp.jtl"
$html = "artifacts\smoke_html_$stamp"

Write-Host "Running smoke profile..." -ForegroundColor Cyan
Write-Host "Threads=1, Ramp=1s, Loops=5, Target response <= 300ms"

& $jmeter -n `
    -t ".\Bismarck_Sprint2_Authorization_Performance.jmx" `
    -JTHREADS=1 `
    -JRAMP=1 `
    -JLOOPS=5 `
    -JRESPONSE_TIME_LIMIT_MS=300 `
    -l $jtl `
    -e -o $html

$exitCode = $LASTEXITCODE
Write-Host ""
Write-Host "JTL:  $jtl"
Write-Host "HTML: $html\index.html"

if (Get-Command python -ErrorAction SilentlyContinue) {
    python ".\analyze_results.py" $jtl
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    py ".\analyze_results.py" $jtl
}

exit $exitCode
