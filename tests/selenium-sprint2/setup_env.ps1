$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$example = Join-Path $PSScriptRoot ".env.selenium.example"
$target  = Join-Path $PSScriptRoot ".env.selenium"

if (-not (Test-Path $example)) {
    throw ".env.selenium.example was not found."
}

Copy-Item $example $target -Force

$securePassword = Read-Host "Enter the QA Admin test password" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

# Quote the dotenv value and escape characters that matter inside a quoted value.
$escapedPassword = $plainPassword.Replace("\", "\\").Replace('"', '\"')
$content = Get-Content $target -Raw
$content = $content.Replace("QA_ADMIN_PASSWORD=CHANGE_ME", "QA_ADMIN_PASSWORD=`"$escapedPassword`"")
Set-Content -Path $target -Value $content -Encoding UTF8

Write-Host ""
Write-Host "Created local Selenium configuration:" -ForegroundColor Green
Write-Host "  $target"
Write-Host ""
Write-Host "The password is not stored in the downloadable source ZIP; it is only in your local .env.selenium file." -ForegroundColor Yellow
