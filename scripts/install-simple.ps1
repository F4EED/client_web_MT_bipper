# GerMaCrise — installation simple Windows (appele par install.bat)
$ErrorActionPreference = "Stop"
$RepoUrl = "https://github.com/F4EED/client_web_MT_bipper.git"
$InstallDir = Join-Path $env:USERPROFILE "GerMaCrise"
$PnpmVersion = "11.9.0"
$Port = "5173"

function Say([string]$m) { Write-Host ""; Write-Host ">> $m" -ForegroundColor Cyan }
function Have([string]$n) { return [bool](Get-Command $n -ErrorAction SilentlyContinue) }
function Refresh-Path {
    $m = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $u = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$m;$u"
}

Write-Host ""
Write-Host "========================================"
Write-Host "  GerMaCrise — installation"
Write-Host "========================================"
Write-Host "  Dossier : $InstallDir"
Write-Host "========================================"

# Deja dans le depot ?
$rootCandidate = Split-Path $PSScriptRoot -Parent
if ((Test-Path (Join-Path $rootCandidate "package.json")) -and (Test-Path (Join-Path $rootCandidate "pnpm-workspace.yaml"))) {
    $InstallDir = $rootCandidate
}

Say "1/4 — Outils (Git, Node)"
if (-not (Have "winget")) {
    Write-Host "Installez Git et Node.js LTS depuis :"
    Write-Host "  https://git-scm.com/download/win"
    Write-Host "  https://nodejs.org/"
    Write-Host "Puis relancez install.bat"
    exit 1
}
if (-not (Have "git")) {
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
}
if (-not (Have "node")) {
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
}
if (-not (Have "git") -or -not (Have "node")) {
    Write-Host "Fermez cette fenetre, rouvrez-la, puis relancez install.bat"
    exit 1
}

Say "2/4 — Outils GerMaCrise"
$pnpmOk = $false
if (Have "pnpm") {
    try { $null = pnpm -v 2>$null; if ($LASTEXITCODE -eq 0) { $pnpmOk = $true } } catch {}
}
if (-not $pnpmOk) {
    npm install -g "pnpm@$PnpmVersion"
    Refresh-Path
}
if (-not (Have "pnpm")) {
    Write-Host "Echec pnpm. Verifiez Internet et reessayez."
    exit 1
}

Say "3/4 — Telechargement"
if ((Test-Path (Join-Path $InstallDir "package.json")) -and (Test-Path (Join-Path $InstallDir "pnpm-workspace.yaml"))) {
    if (Test-Path (Join-Path $InstallDir ".git")) {
        try { git -C $InstallDir pull --ff-only } catch {}
    }
} else {
    if (Test-Path $InstallDir) {
        Write-Host "Le dossier $InstallDir existe deja. Renommez-le puis relancez."
        exit 1
    }
    git clone $RepoUrl $InstallDir
}

Say "4/4 — Installation (patientez)…"
Set-Location $InstallDir
pnpm install

$demarrer = @"
@echo off
chcp 65001 >nul
cd /d "$InstallDir"
echo.
echo GerMaCrise demarre…
echo Ouvrez Chrome ou Edge : http://localhost:$Port
echo Laissez cette fenetre ouverte.
echo.
pnpm --filter meshtastic-web dev -- --host 0.0.0.0 --port $Port
pause
"@
$demarrerPath = Join-Path $InstallDir "demarrer.bat"
Set-Content -Path $demarrerPath -Value $demarrer -Encoding UTF8
$shortcut = Join-Path $env:USERPROFILE "Desktop\GerMaCrise.bat"
try { Copy-Item $demarrerPath $shortcut -Force } catch {}
$homeLauncher = Join-Path $env:USERPROFILE "demarrer-GerMaCrise.bat"
Copy-Item $demarrerPath $homeLauncher -Force

Write-Host ""
Write-Host "========================================"
Write-Host "  C'est pret."
Write-Host ""
Write-Host "  Ouvrez Chrome / Edge :"
Write-Host "    http://localhost:$Port"
Write-Host ""
Write-Host "  Pour relancer : double-clic sur"
Write-Host "    demarrer-GerMaCrise.bat (dossier Utilisateur)"
Write-Host "========================================"
Write-Host ""

Start-Process "http://localhost:$Port"
pnpm --filter meshtastic-web dev -- --host 0.0.0.0 --port $Port
