#Requires -Version 5.1
# GerMaCrise - installation Windows 10/11 (un seul script)
#   Install :     irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex
#                 ou double-clic install.bat
#   Raccourci :   powershell -NoProfile -ExecutionPolicy Bypass -File install.ps1 -Icone
$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/F4EED/client_web_MT_bipper.git"
$PnpmVersion = "11.9.0"
$Port = "5173"
$InstallDir = Join-Path $env:USERPROFILE "GerMaCrise"

$IconeOnly = $false
foreach ($a in @($args)) {
    if ("$a" -match '^(?i)-?Icone$' -or "$a" -match '^(?i)-?Shortcut$') {
        $IconeOnly = $true
    }
}

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

function Get-DesktopDir {
    $desktop = [Environment]::GetFolderPath("Desktop")
    if ($desktop -and (Test-Path $desktop)) { return $desktop }
    foreach ($name in @("Bureau", "Desktop")) {
        $p = Join-Path $env:USERPROFILE $name
        if (Test-Path $p) { return $p }
    }
    $p = Join-Path $env:USERPROFILE "Desktop"
    New-Item -ItemType Directory -Path $p -Force | Out-Null
    return $p
}

function Write-Utf8NoBom {
    param([string]$Path, [string]$Content)
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Ensure-Ico {
    param([string]$PngPath, [string]$IcoPath)
    if (Test-Path $IcoPath) { return $IcoPath }
    if (-not (Test-Path $PngPath)) { return $null }
    try {
        Add-Type -AssemblyName System.Drawing -ErrorAction Stop
        $src = [System.Drawing.Bitmap]::FromFile($PngPath)
        $bmp = New-Object System.Drawing.Bitmap 48, 48
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.DrawImage($src, 0, 0, 48, 48)
        $g.Dispose()
        $icon = [System.Drawing.Icon]::FromHandle($bmp.GetHicon())
        $fs = [System.IO.File]::Create($IcoPath)
        $icon.Save($fs)
        $fs.Close()
        $icon.Dispose()
        $bmp.Dispose()
        $src.Dispose()
        return $IcoPath
    } catch {
        return $null
    }
}

function New-GerMaShortcut {
    param([Parameter(Mandatory = $true)][string]$Dir)

    if (-not (Test-Path (Join-Path $Dir "package.json"))) {
        Write-Host "Dossier GerMaCrise introuvable. Lancez d'abord l'installation :"
        Write-Host "  irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 | iex"
        exit 1
    }

    $nodeDir = "C:\Program Files\nodejs"
    $nodeExe = Join-Path $nodeDir "node.exe"
    $npmCmd = Join-Path $nodeDir "npm.cmd"
    if (-not (Test-Path $nodeExe)) {
        $n = Get-Command node -ErrorAction SilentlyContinue
        if ($n) {
            $nodeExe = $n.Source
            $nodeDir = Split-Path $nodeExe -Parent
            $npmCmd = Join-Path $nodeDir "npm.cmd"
        }
    }
    $npmGlobal = Join-Path $env:APPDATA "npm"
    $pnpmCmd = Join-Path $npmGlobal "pnpm.cmd"
    $pnpmMjsApp = Join-Path $npmGlobal "node_modules\pnpm\bin\pnpm.mjs"
    $pnpmMjsLocal = Join-Path $Dir "node_modules\pnpm\bin\pnpm.mjs"

    $demarrerBat = Join-Path $Dir "demarrer.bat"
    $demarrerContent = @"
@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "$Dir"
set HUSKY=0
set "GERMA_NODE=$nodeExe"
set "GERMA_NPM=$npmCmd"
set "GERMA_PNPM_CMD=$pnpmCmd"
set "GERMA_PNPM_MJS=$pnpmMjsApp"
if exist "$pnpmMjsLocal" set "GERMA_PNPM_MJS=$pnpmMjsLocal"

REM PATH propre : jamais Python\Scripts (sinon meshtastic.exe pollue npm/pnpm)
set "PATH=$nodeDir;$npmGlobal;%SystemRoot%\system32;%SystemRoot%;%SystemRoot%\System32\Wbem"

echo.
echo ========================================
echo   GerMaCrise - serveur local
echo ========================================
echo   Ouvrez Chrome ou Edge (Bluetooth natif) :
echo     http://localhost:$Port
echo   Firefox : USB seulement, pas de BLE.
echo   Laissez cette fenetre ouverte.
echo ========================================
echo.
start "" "http://localhost:$Port"

if not exist "%GERMA_NODE%" (
  echo Node.js introuvable. Reinstallez Node LTS depuis https://nodejs.org/
  pause
  exit /b 1
)

if exist "%GERMA_PNPM_MJS%" (
  "%GERMA_NODE%" "%GERMA_PNPM_MJS%" --filter meshtastic-web exec vite -- --host 0.0.0.0 --port $Port
  goto :fin
)

if exist "%GERMA_PNPM_CMD%" (
  call "%GERMA_PNPM_CMD%" --filter meshtastic-web exec vite -- --host 0.0.0.0 --port $Port
  goto :fin
)

if exist "%GERMA_NPM%" (
  call "%GERMA_NPM%" exec --yes -- pnpm@$PnpmVersion --filter meshtastic-web exec vite -- --host 0.0.0.0 --port $Port
  goto :fin
)

echo Impossible de lancer pnpm/vite. Relancez l'install :
echo   irm https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1 ^| iex
pause
exit /b 1

:fin
echo.
pause
endlocal
"@
    Write-Utf8NoBom -Path $demarrerBat -Content $demarrerContent

    $iconPng = Join-Path $Dir "apps\web\public\images\germacrise_icon.png"
    $iconIco = Join-Path $Dir "apps\web\public\images\germacrise_icon.ico"
    $faviconIco = Join-Path $Dir "apps\web\public\favicon.ico"
    $iconForLnk = Ensure-Ico -PngPath $iconPng -IcoPath $iconIco
    if (-not $iconForLnk) {
        if (Test-Path $faviconIco) { $iconForLnk = $faviconIco }
        elseif (Test-Path $iconPng) { $iconForLnk = $iconPng }
    }

    $desktopDir = Get-DesktopDir
    $desktopLnk = Join-Path $desktopDir "GerMaCrise.lnk"
    $desktopBat = Join-Path $desktopDir "GerMaCrise.bat"

    Copy-Item $demarrerBat (Join-Path $env:USERPROFILE "demarrer-GerMaCrise.bat") -Force
    Copy-Item $demarrerBat $desktopBat -Force

    $lnkOk = $false
    try {
        $w = New-Object -ComObject WScript.Shell
        $s = $w.CreateShortcut($desktopLnk)
        $s.TargetPath = "$env:ComSpec"
        $s.Arguments = "/c `"$demarrerBat`""
        $s.WorkingDirectory = $Dir
        $s.WindowStyle = 1
        $s.Description = "Demarrer GerMaCrise"
        if ($iconForLnk) { $s.IconLocation = "$iconForLnk,0" }
        $s.Save()
        $lnkOk = $true
    } catch {
        $lnkOk = $false
    }

    Write-Host ""
    Write-Host ("Bureau detecte : {0}" -f $desktopDir)
    if ($lnkOk) {
        Write-Host ("Raccourci : {0}" -f $desktopLnk)
    } else {
        Write-Host "Echec .lnk - utilisez GerMaCrise.bat sur le Bureau."
    }
    Write-Host ("Bat       : {0}" -f $desktopBat)
    Write-Host ("Aussi     : {0}" -f (Join-Path $env:USERPROFILE "demarrer-GerMaCrise.bat"))
    Write-Host ""
    Write-Host "Si erreur Python 'meshtastic' : le lanceur ignore desormais Python\Scripts."
    Write-Host "Optionnel : pip uninstall meshtastic"
    Write-Host ""
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

if ($IconeOnly) {
    Write-Host ""
    Write-Host "========================================"
    Write-Host "  GerMaCrise - raccourci Bureau"
    Write-Host "========================================"
    New-GerMaShortcut -Dir $InstallDir
    exit 0
}

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
New-GerMaShortcut -Dir $InstallDir

Write-Host ""
Write-Host "========================================"
Write-Host "  C est pret."
Write-Host ""
Write-Host "  Ouvrez Chrome ou Edge (Bluetooth natif) :"
Write-Host ("    http://localhost:{0}" -f $Port)
Write-Host ""
Write-Host "  Bluetooth Windows :"
Write-Host "    - Chrome / Edge : Web Bluetooth natif (aucun flag)"
Write-Host "    - Firefox : pas de BLE (USB = onglet Serial, Firefox 151+)"
Write-Host "    - PIN usine Gaulix : 123456"
Write-Host "    - Ne pas appairer le noeud dans Parametres > Bluetooth avant le navigateur"
Write-Host "    - URL : http://localhost (pas l'IP du PC)"
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
