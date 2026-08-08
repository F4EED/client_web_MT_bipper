#Requires -Version 5.1
<#
  GerMaCrise - installation simple Windows 10/11

    irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex

  ou double-clic install.bat
#>
$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/F4EED/client_web_MT_bipper.git"
$PnpmVersion = "11.9.0"
$Port = "5173"
$InstallDir = Join-Path $env:USERPROFILE "GerMaCrise"

function Say {
    param([string]$Message)
    Write-Host ""
    Write-Host (">> {0}" -f $Message) -ForegroundColor Cyan
}

function Have {
    param([string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
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

function Write-Utf8NoBom {
    param([string]$Path, [string]$Content)
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function New-GerMaCriseShortcut {
    param([string]$TargetBat, [string]$ShortcutPath, [string]$IconPath)
    try {
        $w = New-Object -ComObject WScript.Shell
        $s = $w.CreateShortcut($ShortcutPath)
        $s.TargetPath = $TargetBat
        $s.WorkingDirectory = Split-Path $TargetBat -Parent
        $s.WindowStyle = 1
        $s.Description = "Demarrer GerMaCrise"
        if ($IconPath -and (Test-Path $IconPath)) { $s.IconLocation = "$IconPath,0" }
        $s.Save()
        return $true
    } catch {
        return $false
    }
}

# Call pnpm reliably (avoid PowerShell $Args bug + Python meshtastic.exe conflict)
function Invoke-GerMaPnpm {
    param([Parameter(Mandatory = $true)][string[]]$PnpmArgs)
    $prevPath = $env:Path
    try {
        $env:HUSKY = "0"
        Refresh-Path
        if (Have "pnpm") {
            $pnpmCmd = (Get-Command pnpm -ErrorAction Stop).Source
            if ($pnpmCmd -match "Python|meshtastic") {
                Write-Host ("pnpm suspect ignore ({0}) - fallback npm exec" -f $pnpmCmd)
                & npm exec --yes -- ("pnpm@{0}" -f $PnpmVersion) @PnpmArgs
            } else {
                & pnpm @PnpmArgs
            }
        } else {
            & npm exec --yes -- ("pnpm@{0}" -f $PnpmVersion) @PnpmArgs
        }
        return $LASTEXITCODE
    } finally {
        $env:Path = $prevPath
    }
}

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
Write-Host "  GerMaCrise - installation Windows"
Write-Host "========================================"
Write-Host ("  Dossier : {0}" -f $InstallDir)
Write-Host "========================================"

Say "1/4 - Preparation (Git, Node.js)"
Refresh-Path
if (-not (Have "git") -or -not (Have "node")) {
    if (-not (Have "winget")) {
        Write-Host "Installez Git + Node LTS puis relancez :"
        Write-Host "  https://git-scm.com/download/win"
        Write-Host "  https://nodejs.org/"
        Read-Host "Entree pour fermer"
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
}
if (-not (Have "git") -or -not (Have "node")) {
    Write-Host "Fermez cette fenetre, rouvrez Terminal, puis relancez la commande."
    Read-Host "Entree pour fermer"
    exit 1
}
Write-Host ("OK - Node {0}" -f (node -v))

Say "2/4 - Outils GerMaCrise (pnpm)"
$env:HUSKY = "0"
try {
    & npm install -g ("pnpm@{0}" -f $PnpmVersion) 2>&1 | Out-Null
} catch {}
Refresh-Path
$code = Invoke-GerMaPnpm @("--version")
if ($code -ne 0) {
    Write-Host "Impossible d'executer pnpm. Verifiez Node/npm."
    Read-Host "Entree pour fermer"
    exit 1
}

Say "3/4 - Telechargement"
if ((Test-Path (Join-Path $InstallDir "package.json")) -and
    (Test-Path (Join-Path $InstallDir "pnpm-workspace.yaml"))) {
    if (Test-Path (Join-Path $InstallDir ".git")) {
        try { & git -C $InstallDir pull --ff-only 2>&1 | Out-Null } catch {}
    }
} else {
    if (Test-Path $InstallDir) {
        Write-Host ("Le dossier {0} existe deja et n'est pas GerMaCrise." -f $InstallDir)
        Write-Host "Renommez-le ou supprimez-le, puis relancez."
        Read-Host "Entree pour fermer"
        exit 1
    }
    & git clone --depth 1 $RepoUrl $InstallDir
    try { & git -C $InstallDir fetch --tags --depth 1 2>&1 | Out-Null } catch {}
}

Say "4/4 - Installation des composants (2-5 min)..."
Set-Location $InstallDir
$logFile = Join-Path $env:TEMP "germa-pnpm-install.log"
$env:HUSKY = "0"
$installOutput = & {
    Invoke-GerMaPnpm @("install", "--reporter=append-only") 2>&1
}
$installOutput | Tee-Object -FilePath $logFile | Out-Host
$installCode = $LASTEXITCODE
if ($installCode -ne 0) {
    Write-Host ""
    Write-Host ("ECHEC pnpm install (code {0})." -f $installCode) -ForegroundColor Red
    Write-Host ("Journal : {0}" -f $logFile)
    Write-Host ""
    Write-Host "Si vous voyez une erreur Python 'meshtastic' :"
    Write-Host "  ce n'est PAS le client web - desinstallez le conflit :"
    Write-Host "  pip uninstall meshtastic"
    Write-Host "  puis relancez l'install GerMaCrise."
    Write-Host ""
    Write-Host ("Sinon : supprimez le dossier {0} et reessayez." -f $InstallDir)
    Read-Host "Entree pour fermer"
    exit 1
}

$demarrerBat = Join-Path $InstallDir "demarrer.bat"
$demarrerContent = @"
@echo off
chcp 65001 >nul
cd /d "$InstallDir"
set HUSKY=0
echo.
echo ========================================
echo   GerMaCrise - serveur local
echo ========================================
echo   Ouvrez Chrome ou Edge :
echo     http://localhost:$Port
echo   Laissez cette fenetre ouverte.
echo ========================================
echo.
start "" "http://localhost:$Port"
call npm exec --yes -- pnpm@$PnpmVersion --filter meshtastic-web exec vite -- --host 0.0.0.0 --port $Port
echo.
pause
"@
Write-Utf8NoBom -Path $demarrerBat -Content $demarrerContent

$iconPng = Join-Path $InstallDir "apps\web\public\images\germacrise_icon.png"
$desktopDir = Get-DesktopDir
$desktopLnk = Join-Path $desktopDir "GerMaCrise.lnk"
Copy-Item $demarrerBat (Join-Path $env:USERPROFILE "demarrer-GerMaCrise.bat") -Force
$lnkOk = New-GerMaCriseShortcut -TargetBat $demarrerBat -ShortcutPath $desktopLnk -IconPath $iconPng
if (-not $lnkOk) {
    Copy-Item $demarrerBat (Join-Path $desktopDir "GerMaCrise.bat") -Force
}

$creerIcone = Join-Path $InstallDir "creer-icone.ps1"
Write-Utf8NoBom -Path $creerIcone -Content @"
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

Write-Host ""
Write-Host "========================================"
Write-Host "  C'est pret."
Write-Host ""
Write-Host "  Ouvrez Chrome / Edge :"
Write-Host ("    http://localhost:{0}" -f $Port)
Write-Host ""
Write-Host "  Relancer : raccourci GerMaCrise sur le Bureau"
Write-Host "========================================"
Write-Host ""
Write-Host "Demarrage du serveur..."
Write-Host ""

Start-Sleep -Seconds 2
try { Start-Process ("http://localhost:{0}" -f $Port) } catch {}
$code = Invoke-GerMaPnpm @(
    "--filter", "meshtastic-web",
    "exec", "vite", "--",
    "--host", "0.0.0.0",
    "--port", $Port
)
if ($code -ne 0) {
    Write-Host ("Le serveur n a pas demarre (code {0})." -f $code)
    Read-Host "Entree pour fermer"
    exit $code
}
