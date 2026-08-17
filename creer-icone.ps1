#Requires -Version 5.1
# Ancien nom — tout est dans install.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\GerMaCrise\install.ps1" -Icone
$ErrorActionPreference = "Stop"
$here = if ($PSScriptRoot) { $PSScriptRoot } else { Join-Path $env:USERPROFILE "GerMaCrise" }
$target = Join-Path $here "install.ps1"
if (-not (Test-Path $target)) {
    Write-Host "install.ps1 introuvable. Installez avec :"
    Write-Host "  irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex"
    exit 1
}
& powershell -NoProfile -ExecutionPolicy Bypass -File $target -Icone
exit $LASTEXITCODE
