#Requires -Version 5.1
# Recree le raccourci Bureau GerMaCrise (Windows).
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\GerMaCrise\creer-icone.ps1"
$ErrorActionPreference = "Stop"

$PnpmVersion = "11.9.0"
$Port = "5173"

if ($PSScriptRoot) {
    $InstallDir = $PSScriptRoot
} else {
    $InstallDir = Join-Path $env:USERPROFILE "GerMaCrise"
}

if (-not (Test-Path (Join-Path $InstallDir "package.json"))) {
    Write-Host "Dossier GerMaCrise introuvable. Lancez d'abord install.ps1"
    exit 1
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

# Chemins Node (evite le PATH pollue par Python\Scripts\meshtastic.exe)
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
$pnpmMjsLocal = Join-Path $InstallDir "node_modules\pnpm\bin\pnpm.mjs"
$pnpmMjsRoot = Join-Path $InstallDir "node_modules\.pnpm\pnpm@$PnpmVersion*\node_modules\pnpm\bin\pnpm.mjs"

$demarrerBat = Join-Path $InstallDir "demarrer.bat"
# PATH minimal : Node + npm global + system32. PAS de Python\Scripts (meshtastic.exe).
$demarrerContent = @"
@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "$InstallDir"
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
echo   Ouvrez Chrome ou Edge :
echo     http://localhost:$Port
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

$iconPng = Join-Path $InstallDir "apps\web\public\images\germacrise_icon.png"
$iconIco = Join-Path $InstallDir "apps\web\public\images\germacrise_icon.ico"
$faviconIco = Join-Path $InstallDir "apps\web\public\favicon.ico"
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
    # /k garde la fenetre si erreur ; on utilise /c + pause dans le bat
    $s.TargetPath = "$env:ComSpec"
    $s.Arguments = "/c `"$demarrerBat`""
    $s.WorkingDirectory = $InstallDir
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
