@echo off
setlocal
REM Lanceur Windows pour install-local.ps1 (double-clic ou invite de commandes)
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-local.ps1" %*
exit /b %ERRORLEVEL%
