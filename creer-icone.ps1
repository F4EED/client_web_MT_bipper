#Requires -Version 5.1
<#
  Recree le raccourci Bureau GerMaCrise (Windows).
  Usage :
    powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\GerMaCrise\creer-icone.ps1"
#>
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
    # OneDrive / FR / EN : GetFolderPath est la source de verite
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
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo npm introuvable. Reinstallez Node.js LTS puis relancez.
  pause
  exit /b 1
)
call npm.cmd exec --yes -- pnpm@$PnpmVersion --filter meshtastic-web exec vite -- --host 0.0.0.0 --port $Port
echo.
pause
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
    # cmd.exe lance mieux les .bat depuis un .lnk
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
    Write-Host "Echec .lnk — utilisez GerMaCrise.bat sur le Bureau."
}
Write-Host ("Bat       : {0}" -f $desktopBat)
Write-Host ("Aussi     : {0}" -f (Join-Path $env:USERPROFILE "demarrer-GerMaCrise.bat"))
Write-Host ""
