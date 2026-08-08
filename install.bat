@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   GerMaCrise — installation Windows
echo ========================================
echo.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-simple.ps1"
if errorlevel 1 pause
