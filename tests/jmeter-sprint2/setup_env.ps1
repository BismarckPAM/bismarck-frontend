$ErrorActionPreference = "Stop"

Write-Host "Bismarck Sprint 2 JMeter credential setup" -ForegroundColor Cyan
$email = Read-Host "QA Admin email"
$securePassword = Read-Host "QA Admin password" -AsSecureString

$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $env:QA_ADMIN_EMAIL = $email
    $env:QA_ADMIN_PASSWORD = $plainPassword
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

Write-Host "[OK] Credentials loaded into this PowerShell session." -ForegroundColor Green
Write-Host "Password was not printed and is not stored in the JMX file." -ForegroundColor Green
