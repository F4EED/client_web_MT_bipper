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

    # Chemins Node / npm global souvent absents juste apres winget
    $extras = @(
        (Join-Path $env:APPDATA "npm"),
        (Join-Path $env:LOCALAPPDATA "pnpm"),
        "C:\Program Files\nodejs"
    )
    if (Have "node") {
        try { $extras += (Split-Path (Get-Command node -ErrorAction Stop).Source -Parent) } catch {}
    }
    foreach ($p in $extras) {
        if ($p -and (Test-Path $p) -and ($env:Path -notlike "*$p*")) {
            $env:Path = "$p;$env:Path"
        }
    }

    # Eviter meshtastic.exe (pip) devant npm/pnpm
    $parts = $env:Path -split ";" | Where-Object {
        $_ -and ($_ -notmatch '(?i)[\\/]Python[\\/].*[\\/]Scripts') -and ($_ -notmatch '(?i)meshtastic')
    }
    $env:Path = ($parts -join ";")
}

function Get-NpmCmd {
    Refresh-Path
    $c = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    $c = Get-Command npm -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
    $guess = "C:\Program Files\nodejs\npm.cmd"
    if (Test-Path $guess) { return $guess }
    return $null
}

function Get-PnpmLauncher {
    Refresh-Path
    foreach ($name in @("pnpm.cmd", "pnpm")) {
        $c = Get-Command $name -ErrorAction SilentlyContinue
        if (-not $c) { continue }
        if ($c.Source -match "(?i)Python|meshtastic") { continue }
        return $c.Source
    }
    $candidates = @(
        (Join-Path $env:APPDATA "npm\pnpm.cmd"),
        (Join-Path $env:APPDATA "npm\pnpm"),
        (Join-Path $env:LOCALAPPDATA "pnpm\pnpm.exe")
    )
    foreach ($p in $candidates) {
        if (Test-Path $p) { return $p }
    }
    # pnpm.cjs via npm root -g
    $npmCmd = Get-NpmCmd
    if ($npmCmd) {
        try {
            $prev = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            $root = & $npmCmd root -g 2>$null
            $ErrorActionPreference = $prev
            if ($root) {
                $cjs = Join-Path $root.Trim() "pnpm\bin\pnpm.cjs"
                if (Test-Path $cjs) { return "node|$cjs" }
            }
        } catch {}
    }
    return $null
}

function Invoke-GerMaPnpm {
    param([Parameter(Mandatory = $true)][string[]]$PnpmArgs)
    $env:HUSKY = "0"
    $prevEa = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        Refresh-Path
        $launcher = Get-PnpmLauncher
        if ($launcher -and $launcher.StartsWith("node|")) {
            $cjs = $launcher.Substring(5)
            & node $cjs @PnpmArgs
        } elseif ($launcher) {
            & $launcher @PnpmArgs
        } else {
            $npmCmd = Get-NpmCmd
            if (-not $npmCmd) {
                Write-Host "npm introuvable."
                return 1
            }
            & $npmCmd exec --yes -- ("pnpm@{0}" -f $PnpmVersion) @PnpmArgs
        }
        if ($null -eq $LASTEXITCODE) { return 0 }
        return [int]$LASTEXITCODE
    } finally {
        $ErrorActionPreference = $prevEa
    }
}

function Install-GerMaPnpm {
    $prevEa = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        Refresh-Path
        $npmCmd = Get-NpmCmd
        if (-not $npmCmd) {
            Write-Host "npm introuvable apres Node. Rouvrez Terminal et relancez."
            return $false
        }
        Write-Host ("npm : {0}" -f $npmCmd)

        Write-Host ("Installation pnpm@{0} (npm -g)..." -f $PnpmVersion)
        & $npmCmd install -g ("pnpm@{0}" -f $PnpmVersion) 2>&1 | Out-Host
        Refresh-Path

        $launcher = Get-PnpmLauncher
        if ($launcher) {
            Write-Host ("pnpm trouve : {0}" -f $launcher)
            return $true
        }

        # Repli : telechargeur officiel pnpm
        Write-Host "Repli : installateur officiel pnpm..."
        try {
            Invoke-WebRequest -UseBasicParsing -Uri "https://get.pnpm.io/install.ps1" -OutFile (Join-Path $env:TEMP "pnpm-get.ps1")
            & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $env:TEMP "pnpm-get.ps1") 2>&1 | Out-Host
            Refresh-Path
        } catch {
            Write-Host ("Installateur pnpm : {0}" -f $_.Exception.Message)
        }

        $launcher = Get-PnpmLauncher
        if ($launcher) {
            Write-Host ("pnpm trouve : {0}" -f $launcher)
            return $true
        }

        # Dernier repli : npm exec (pas besoin d'install globale)
        Write-Host "Repli : npm exec pnpm (sans install globale)..."
        $out = & $npmCmd exec --yes -- ("pnpm@{0}" -f $PnpmVersion) --version 2>&1
        $out | Out-Host
        if ($LASTEXITCODE -eq 0 -or ("$out" -match '\d+\.\d+\.\d+')) {
            return $true
        }
        return $false
    } finally {
        $ErrorActionPreference = $prevEa
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
$npmCmd = Get-NpmCmd
if (-not $npmCmd) {
    Write-Host "Node est la mais npm manque. Reinstallez Node.js LTS depuis https://nodejs.org/"
    Read-Host "Entree pour fermer"
    exit 1
}
Write-Host ("OK - npm {0}" -f (& $npmCmd -v))

Say "2/4 - Outils GerMaCrise (pnpm)"
$env:HUSKY = "0"
if (-not (Install-GerMaPnpm)) {
    Write-Host ""
    Write-Host "Impossible d'executer pnpm." -ForegroundColor Red
    Write-Host "Essayez manuellement puis relancez install.ps1 :"
    Write-Host ("  npm install -g pnpm@{0}" -f $PnpmVersion)
    Write-Host "  (fermez/rouvrez Terminal apres)"
    Read-Host "Entree pour fermer"
    exit 1
}
$prevEa = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$v = & {
    $launcher = Get-PnpmLauncher
    if ($launcher -and $launcher.StartsWith("node|")) {
        & node $launcher.Substring(5) --version 2>&1
    } elseif ($launcher) {
        & $launcher --version 2>&1
    } else {
        $n = Get-NpmCmd
        & $n exec --yes -- ("pnpm@{0}" -f $PnpmVersion) --version 2>&1
    }
}
$ErrorActionPreference = $prevEa
if ("$v" -match '\d+\.\d+') {
    Write-Host ("OK - pnpm {0}" -f ("$v").ToString().Trim())
} else {
    Write-Host "Impossible d'executer pnpm." -ForegroundColor Red
    Write-Host ("Sortie : {0}" -f $v)
    Write-Host ("  npm install -g pnpm@{0}" -f $PnpmVersion)
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
$prevEa = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$installOutput = Invoke-GerMaPnpm @("install", "--reporter=append-only") 2>&1
$installCode = if ($null -eq $LASTEXITCODE) { 0 } else { [int]$LASTEXITCODE }
$ErrorActionPreference = $prevEa
$installOutput | Tee-Object -FilePath $logFile | Out-Host
if ($installCode -ne 0) {
    Write-Host ""
    Write-Host ("ECHEC pnpm install (code {0})." -f $installCode) -ForegroundColor Red
    Write-Host ("Journal : {0}" -f $logFile)
    Write-Host ""
    Write-Host "Si erreur Python 'meshtastic' :  pip uninstall meshtastic"
    Write-Host ("Sinon : supprimez {0} et reessayez." -f $InstallDir)
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
Write-Host ""
Write-Host "  APK Android / AppImage :"
Write-Host "    https://github.com/F4EED/bipper_android/releases"
Write-Host "========================================"
Write-Host ""
Write-Host "Demarrage du serveur..."
Write-Host ""

Start-Sleep -Seconds 2
try { Start-Process ("http://localhost:{0}" -f $Port) } catch {}
$prevEa = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$code = Invoke-GerMaPnpm @(
    "--filter", "meshtastic-web",
    "exec", "vite", "--",
    "--host", "0.0.0.0",
    "--port", $Port
)
$ErrorActionPreference = $prevEa
if (($null -ne $code) -and ($code -ne 0)) {
    Write-Host ("Le serveur n a pas demarre (code {0})." -f $code)
    Read-Host "Entree pour fermer"
    exit $code
}
