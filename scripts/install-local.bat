@echo off
setlocal
REM Ancien lanceur — appelle install.ps1 a la racine
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\install.ps1" %*
exit /b %ERRORLEVEL%
