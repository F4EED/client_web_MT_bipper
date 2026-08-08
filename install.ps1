#Requires -Version 5.1
<#
  GerMaCrise — installation simple Windows 10/11

  Option A (recommandee) — dans PowerShell :
    irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex

  Option B — double-clic sur install.bat (dans le depot)

  Puis Chrome/Edge → http://localhost:5173
#>
$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/F4EED/client_web_MT_bipper.git"
$PnpmVersion = "11.9.0"
$Port = "5173"
$InstallDir = Join-Path $env:USERPROFILE "GerMaCrise"

function Say([string]$m) {
    Write-Host ""
    Write-Host ">> $m" -ForegroundColor Cyan
}
function Have([string]$n) {
    return [bool](Get-Command $n -ErrorAction SilentlyContinue)
}
function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [Environment]::GetEnvironmentVariable("Path", "User")
    if ($machine -and $user) { $env:Path = "$machine;$user" }
    elseif ($machine) { $env:Path = $machine }
    elseif ($user) { $env:Path = $user }
}
function Get-DesktopDir {
    $bureau = Join-Path $env:USERPROFILE "Bureau"
    if (Test-Path $bureau) { return $bureau }
    $desktop = [Environment]::GetFolderPath("Desktop")
    if ($desktop -and (Test-Path $desktop)) { return $desktop }
    return (Join-Path $env:USERPROFILE "Desktop")
}
function Write-Utf8NoBom([string]$Path, [string]$Content) {
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}
function New-GerMaCriseShortcut {
    param(
        [string]$TargetBat,
        [string]$ShortcutPath,
        [string]$IconPath
    )
    try {
        $w = New-Object -ComObject WScript.Shell
        $s = $w.CreateShortcut($ShortcutPath)
        $s.TargetPath = $TargetBat
        $s.WorkingDirectory = Split-Path $TargetBat -Parent
        $s.WindowStyle = 1
        $s.Description = "Demarrer GerMaCrise"
        if ($IconPath -and (Test-Path $IconPath)) {
            $s.IconLocation = "$IconPath,0"
        }
        $s.Save()
        return $true
    } catch {
        return $false
    }
}

# Si le script est dans un depot deja present, on l'utilise
try {
    if ($PSScriptRoot) {
        $rootCandidate = $PSScriptRoot
        if ((Test-Path (Join-Path $rootCandidate "package.json")) -and
            (Test-Path (Join-Path $rootCandidate "pnpm-workspace.yaml"))) {
            $InstallDir = $rootCandidate
        }
    }
} catch {}

Write-Host ""
Write-Host "========================================"
Write-Host "  GerMaCrise — installation Windows"
Write-Host "========================================"
Write-Host "  Dossier : $InstallDir"
Write-Host "  (quelques minutes)"
Write-Host "========================================"

# --- 1. Git + Node ---
Say "1/4 — Preparation (Git, Node.js)"
Refresh-Path
if (-not (Have "git") -or -not (Have "node")) {
    if (-not (Have "winget")) {
        Write-Host ""
        Write-Host "Installez puis relancez :"
        Write-Host "  Git  : https://git-scm.com/download/win"
        Write-Host "  Node : https://nodejs.org/  (bouton LTS)"
        Write-Host ""
        Read-Host "Appuyez sur Entree pour fermer"
        exit 1
    }
    if (-not (Have "git")) {
        Write-Host "Installation de Git…"
        winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
        Refresh-Path
    }
    if (-not (Have "node")) {
        Write-Host "Installation de Node.js…"
        winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
        Refresh-Path
    }
}
if (-not (Have "git") -or -not (Have "node")) {
    Write-Host ""
    Write-Host "Git ou Node pas encore visibles."
    Write-Host "Fermez cette fenetre, rouvrez PowerShell, puis relancez."
    Write-Host ""
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}
Write-Host ("OK — Node {0} | {1}" -f (node -v), (git --version))

# --- 2. pnpm (sans corepack) ---
Say "2/4 — Outils GerMaCrise"
$pnpmOk = $false
if (Have "pnpm") {
    try {
        $null = & pnpm -v 2>$null
        if ($LASTEXITCODE -eq 0) { $pnpmOk = $true }
    } catch {}
}
$script:UseNpxPnpm = $false
if (-not $pnpmOk) {
    Write-Host "Installation de pnpm…"
    try {
        & npm install -g "pnpm@$PnpmVersion" 2>&1 | Out-Host
        Refresh-Path
        $null = & pnpm -v 2>$null
        if ($LASTEXITCODE -eq 0) { $pnpmOk = $true }
    } catch {}
}
if (-not $pnpmOk) {
    Write-Host "pnpm global indisponible — utilisation de npx (OK)."
    $script:UseNpxPnpm = $true
    $pnpmOk = $true
}
if ($script:UseNpxPnpm) {
    Write-Host "OK — npx pnpm@$PnpmVersion"
    function Invoke-Pnpm { param([string[]]$Args) & npx --yes "pnpm@$PnpmVersion" @Args }
} else {
    Write-Host ("OK — pnpm {0}" -f (pnpm -v))
    function Invoke-Pnpm { param([string[]]$Args) & pnpm @Args }
}

# --- 3. Code ---
Say "3/4 — Telechargement"
if ((Test-Path (Join-Path $InstallDir "package.json")) -and
    (Test-Path (Join-Path $InstallDir "pnpm-workspace.yaml"))) {
    if (Test-Path (Join-Path $InstallDir ".git")) {
        Write-Host "Mise a jour…"
        try { & git -C $InstallDir pull --ff-only } catch {}
    } else {
        Write-Host "Depot local deja present."
    }
} else {
    if (Test-Path $InstallDir) {
        Write-Host "Le dossier $InstallDir existe deja. Renommez-le puis relancez."
        Read-Host "Appuyez sur Entree pour fermer"
        exit 1
    }
    & git clone $RepoUrl $InstallDir
}

# --- 4. Install + raccourcis ---
Say "4/4 — Installation des composants (patientez)…"
Set-Location $InstallDir
Invoke-Pnpm @("install")
if ($LASTEXITCODE -ne 0) {
    Write-Host "pnpm install a echoue."
    Read-Host "Appuyez sur Entree pour fermer"
    exit 1
}

$pnpmLaunch = if ($script:UseNpxPnpm) {
    "npx --yes pnpm@$PnpmVersion --filter meshtastic-web dev -- --host 0.0.0.0 --port $Port"
} else {
    "pnpm --filter meshtastic-web dev -- --host 0.0.0.0 --port $Port"
}

$demarrerBat = Join-Path $InstallDir "demarrer.bat"
$demarrerContent = @"
@echo off
chcp 65001 >nul
cd /d "$InstallDir"
echo.
echo ========================================
echo   GerMaCrise — serveur local
echo ========================================
echo   Ouvrez Chrome ou Edge :
echo     http://localhost:$Port
echo   Laissez cette fenetre ouverte.
echo   Ctrl+C pour arreter.
echo ========================================
echo.
start "" "http://localhost:$Port"
$pnpmLaunch
echo.
pause
"@
Write-Utf8NoBom -Path $demarrerBat -Content $demarrerContent

$iconPng = Join-Path $InstallDir "apps\web\public\images\germacrise_icon.png"
$desktopDir = Get-DesktopDir
$desktopLnk = Join-Path $desktopDir "GerMaCrise.lnk"
$homeBat = Join-Path $env:USERPROFILE "demarrer-GerMaCrise.bat"
Copy-Item $demarrerBat $homeBat -Force

$lnkOk = New-GerMaCriseShortcut -TargetBat $demarrerBat -ShortcutPath $desktopLnk -IconPath $iconPng
if (-not $lnkOk) {
    Copy-Item $demarrerBat (Join-Path $desktopDir "GerMaCrise.bat") -Force
}

# Script pour recreer l'icone
$creerIcone = Join-Path $InstallDir "creer-icone.ps1"
$creerContent = @"
`$InstallDir = '$InstallDir'
`$demarrerBat = Join-Path `$InstallDir 'demarrer.bat'
`$iconPng = Join-Path `$InstallDir 'apps\web\public\images\germacrise_icon.png'
`$bureau = Join-Path `$env:USERPROFILE 'Bureau'
if (-not (Test-Path `$bureau)) { `$bureau = [Environment]::GetFolderPath('Desktop') }
`$lnk = Join-Path `$bureau 'GerMaCrise.lnk'
`$w = New-Object -ComObject WScript.Shell
`$s = `$w.CreateShortcut(`$lnk)
`$s.TargetPath = `$demarrerBat
`$s.WorkingDirectory = `$InstallDir
`$s.Description = 'Demarrer GerMaCrise'
if (Test-Path `$iconPng) { `$s.IconLocation = "`$iconPng,0" }
`$s.Save()
Copy-Item `$demarrerBat (Join-Path `$env:USERPROFILE 'demarrer-GerMaCrise.bat') -Force
Write-Host "Raccourci cree : `$lnk"
"@
Write-Utf8NoBom -Path $creerIcone -Content $creerContent

Write-Host ""
Write-Host "========================================"
Write-Host "  C'est pret."
Write-Host ""
Write-Host "  → Ouvrez Chrome / Edge :"
Write-Host "       http://localhost:$Port"
Write-Host ""
Write-Host "  → Relancer plus tard :"
if ($lnkOk) {
    Write-Host "       • Raccourci GerMaCrise sur le Bureau"
} else {
    Write-Host "       • GerMaCrise.bat sur le Bureau"
}
Write-Host "       • ou demarrer-GerMaCrise.bat (dossier Utilisateur)"
Write-Host "========================================"
Write-Host ""
Write-Host "Demarrage… (laissez cette fenetre ouverte)"
Write-Host ""

Start-Sleep -Seconds 2
try { Start-Process "http://localhost:$Port" } catch {}
Invoke-Pnpm @("--filter", "meshtastic-web", "dev", "--", "--host", "0.0.0.0", "--port", $Port)
