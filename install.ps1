#Requires -Version 5.1
# GerMaCrise - installation simple Windows 10/11
#   irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex
#   ou double-clic install.bat
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
    $parts = $env:Path -split ";" | Where-Object {
        $_ -and ($_ -notmatch '(?i)[\\/]Python[\\/].*[\\/]Scripts') -and ($_ -notmatch '(?i)meshtastic')
    }
    $env:Path = ($parts -join ";")
}

function Invoke-GerMaPnpm {
    param([Parameter(Mandatory = $true)][string[]]$PnpmArgs)
    $env:HUSKY = "0"
    Refresh-Path
    if (Have "pnpm") {
        $pnpmCmd = (Get-Command pnpm -ErrorAction Stop).Source
        if ($pnpmCmd -match "(?i)Python|meshtastic") {
            Write-Host ("pnpm suspect ignore ({0}) - fallback npm.cmd" -f $pnpmCmd)
            & npm.cmd exec --yes -- ("pnpm@{0}" -f $PnpmVersion) @PnpmArgs
        } else {
            & pnpm @PnpmArgs
        }
    } else {
        & npm.cmd exec --yes -- ("pnpm@{0}" -f $PnpmVersion) @PnpmArgs
    }
    return $LASTEXITCODE
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
    & npm.cmd install -g ("pnpm@{0}" -f $PnpmVersion) 2>&1 | Out-Null
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
    Write-Host "  pip uninstall meshtastic"
    Write-Host "  puis relancez l'install GerMaCrise."
    Write-Host ""
    Write-Host ("Sinon : supprimez le dossier {0} et reessayez." -f $InstallDir)
    Read-Host "Entree pour fermer"
    exit 1
}

Say "Raccourci Bureau..."
$creerIcone = Join-Path $InstallDir "creer-icone.ps1"
if (Test-Path $creerIcone) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $creerIcone
} else {
    Write-Host "creer-icone.ps1 absent - raccourci non cree."
}

Write-Host ""
Write-Host "========================================"
Write-Host "  C est pret."
Write-Host ""
Write-Host "  Ouvrez Chrome / Edge :"
Write-Host ("    http://localhost:{0}" -f $Port)
Write-Host ""
Write-Host "  Relancer :"
Write-Host "    - GerMaCrise sur le Bureau (.lnk ou .bat)"
Write-Host "    - ou %USERPROFILE%\demarrer-GerMaCrise.bat"
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
