#Requires -Version 5.1
# Ancien nom — redirige vers install.ps1 a la racine
$root = Split-Path $PSScriptRoot -Parent
$target = Join-Path $root "install.ps1"
if (-not (Test-Path $target)) {
    Write-Host "install.ps1 introuvable. Relancez depuis le depot ou :"
    Write-Host "  irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex"
    exit 1
}
& $target @args
