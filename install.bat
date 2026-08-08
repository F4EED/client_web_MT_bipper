@echo off
chcp 65001 >nul
title GerMaCrise - installation
echo.
echo ========================================
echo   GerMaCrise - installation Windows
echo ========================================
echo.
cd /d "%~dp0"

REM Si lance hors depot : telecharger install.ps1 depuis GitHub
if not exist "%~dp0install.ps1" (
  echo Telechargement du script d'installation...
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/F4EED/client_web_MT_bipper/main/install.ps1' -OutFile '%TEMP%\germa-install.ps1'; powershell -NoProfile -ExecutionPolicy Bypass -File '%TEMP%\germa-install.ps1'"
  if errorlevel 1 pause
  exit /b %ERRORLEVEL%
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
if errorlevel 1 (
  echo.
  echo Echec de l'installation.
  pause
)
