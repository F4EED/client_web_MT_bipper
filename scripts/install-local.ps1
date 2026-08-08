#Requires -Version 5.1
<#
.SYNOPSIS
  Install local du client web GerMaCrise / Gaulix Bipper (Windows, sans Docker / Cursor).

.DESCRIPTION
  - Verifie / installe Git et Node.js 20+ (winget, sauf -SkipWinget)
  - Active pnpm 11.9.0 (corepack ou npx)
  - Clone le depot si besoin, puis pnpm install
  - Options : -StartDev, -Build

.EXAMPLE
  .\scripts\install-local.ps1
  .\scripts\install-local.ps1 -StartDev
  .\scripts\install-local.ps1 -TargetDir "D:\GerMaCrise\web" -Build
#>
[CmdletBinding()]
param(
    [string] $TargetDir = "",
    [string] $RepoUrl = "https://github.com/F4EED/client_web_MT_bipper.git",
    [switch] $SkipWinget,
    [switch] $StartDev,
    [switch] $Build,
    [switch] $NoClone
)

$ErrorActionPreference = "Stop"
$PnpmVersion = "11.9.0"
$UseNpxPnpm = $false

function Write-Step([string] $Message) {
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Cmd([string] $Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
    $machine = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $user = [System.Environment]::GetEnvironmentVariable("Path", "User")
    if ($machine -and $user) { $env:Path = "$machine;$user" }
    elseif ($machine) { $env:Path = $machine }
    elseif ($user) { $env:Path = $user }
}

function Ensure-WingetPackage {
    param(
        [Parameter(Mandatory = $true)][string] $Id,
        [Parameter(Mandatory = $true)][string] $Label
    )
    if ($SkipWinget) {
        Write-Host "SkipWinget : installation manuelle requise pour $Label" -ForegroundColor Yellow
        return
    }
    if (-not (Test-Cmd "winget")) {
        Write-Host "winget introuvable. Installez $Label manuellement, puis relancez." -ForegroundColor Yellow
        Write-Host "  Git  : https://git-scm.com/download/win"
        Write-Host "  Node : https://nodejs.org/ (LTS)"
        return
    }
    Write-Step "Installation / mise a jour : $Label ($Id)"
    & winget install --id $Id -e --source winget --accept-package-agreements --accept-source-agreements
    Refresh-Path
}

function Get-RepoRoot {
    if ($TargetDir -ne "") {
        if (Test-Path -LiteralPath $TargetDir) {
            return (Resolve-Path -LiteralPath $TargetDir).Path
        }
        return [System.IO.Path]::GetFullPath($TargetDir)
    }
    $scriptRoot = Split-Path -Parent $PSScriptRoot
    $pkg = Join-Path $scriptRoot "package.json"
    $ws = Join-Path $scriptRoot "pnpm-workspace.yaml"
    if ((Test-Path $pkg) -and (Test-Path $ws)) {
        return $scriptRoot
    }
    return (Join-Path $env:USERPROFILE "client_web_MT_bipper")
}

function Invoke-Pnpm {
    param([Parameter(Mandatory = $true)][string[]] $PnpmArgs)
    if ($UseNpxPnpm) {
        $all = @("pnpm@$PnpmVersion") + $PnpmArgs
        & npx @all
    } else {
        & pnpm @PnpmArgs
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Commande pnpm echouee : $($PnpmArgs -join ' ') (code $LASTEXITCODE)"
    }
}

Write-Host "GerMaCrise / Gaulix Bipper — installation locale Windows" -ForegroundColor Green
Write-Host "Doc : docs/install_local.md"

if (-not (Test-Cmd "git")) {
    Ensure-WingetPackage -Id "Git.Git" -Label "Git"
    Refresh-Path
}
if (-not (Test-Cmd "git")) {
    throw "Git est requis. Installez-le puis rouvrez PowerShell."
}

$needNode = $true
if (Test-Cmd "node") {
    $ver = (node -v) -replace '^v', ''
    $major = [int]($ver.Split('.')[0])
    if ($major -ge 20) { $needNode = $false }
    else { Write-Host "Node $ver detecte (< 20). Mise a jour recommandee." -ForegroundColor Yellow }
}
if ($needNode) {
    Ensure-WingetPackage -Id "OpenJS.NodeJS.LTS" -Label "Node.js LTS"
    Refresh-Path
}
if (-not (Test-Cmd "node")) {
    throw "Node.js 20+ est requis. Installez-le depuis https://nodejs.org/ puis rouvrez PowerShell."
}
Write-Host ("Node : {0} | npm : {1} | Git : {2}" -f (node -v), (npm -v), (git --version))

$repoRoot = Get-RepoRoot
Write-Step "Repertoire projet : $repoRoot"

$isRepo = (Test-Path (Join-Path $repoRoot "package.json")) -and
    (Test-Path (Join-Path $repoRoot "pnpm-workspace.yaml"))

if (-not $isRepo) {
    if ($NoClone) {
        throw "Pas de monorepo dans $repoRoot (package.json / pnpm-workspace.yaml manquants)."
    }
    $parent = Split-Path -Parent $repoRoot
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    if (Test-Path $repoRoot) {
        throw "Le dossier existe deja mais n'est pas le depot attendu : $repoRoot"
    }
    Write-Step "Clone $RepoUrl"
    & git clone $RepoUrl $repoRoot
    if ($LASTEXITCODE -ne 0) { throw "git clone a echoue." }
}

Set-Location $repoRoot

Write-Step "Activation pnpm@$PnpmVersion"
$UseNpxPnpm = $true
try {
    & corepack enable 2>$null | Out-Null
    & corepack prepare "pnpm@$PnpmVersion" --activate
    Refresh-Path
    if (Test-Cmd "pnpm") {
        $UseNpxPnpm = $false
        Write-Host "pnpm : $(pnpm -v)"
    }
} catch {
    Write-Host "corepack indisponible, repli sur npx pnpm@$PnpmVersion" -ForegroundColor Yellow
}
if ($UseNpxPnpm) {
    Write-Host "Utilisation de : npx pnpm@$PnpmVersion …"
}

Write-Step "pnpm install (peut prendre plusieurs minutes)"
Invoke-Pnpm -PnpmArgs @("install")

if ($Build) {
    Write-Step "Build production (meshtastic-web → apps/web/dist)"
    Invoke-Pnpm -PnpmArgs @("--filter", "meshtastic-web", "build")
    Write-Host ("Build OK : {0}" -f (Join-Path $repoRoot "apps\web\dist")) -ForegroundColor Green
}

Write-Host ""
Write-Host "Installation terminee." -ForegroundColor Green
Write-Host "Lancer le client :"
Write-Host ("  cd `"{0}`"" -f $repoRoot)
if ($UseNpxPnpm) {
    Write-Host ("  npx pnpm@{0} --filter meshtastic-web dev" -f $PnpmVersion)
} else {
    Write-Host "  pnpm --filter meshtastic-web dev"
}
Write-Host "Puis ouvrir Chrome/Edge sur l'URL affichee (souvent http://localhost:5173)."
Write-Host "Doc : docs\install_local.md"

if ($StartDev) {
    Write-Step "Demarrage serveur de developpement"
    Invoke-Pnpm -PnpmArgs @("--filter", "meshtastic-web", "dev")
}
