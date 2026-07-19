@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "ROOT=%~dp0"
cd /d "%ROOT%"

rem Mode serveur (fenetre secondaire) : ne pas relancer le lanceur.
if /I "%~1"=="server" goto :Server

echo.
echo  Client web Bipper Gaulix / Meshtastic
echo  =====================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js est introuvable.
    echo Installez Node.js 20+ depuis https://nodejs.org/
    pause
    exit /b 1
)

for /f "delims=" %%V in ('node --version 2^>nul') do set "NODE_VER=%%V"
echo  Node.js : %NODE_VER%

if not exist "node_modules\" (
    echo.
    echo  Premiere execution : installation des dependances...
    call :RunPnpm install
    if errorlevel 1 (
        echo [ERREUR] Echec de pnpm install.
        pause
        exit /b 1
    )
)

echo.
echo  Demarrage du serveur de developpement (port 3000)...
echo  Laissez la fenetre "Bipper Web - Serveur" ouverte.
echo.

rem /D fixe le repertoire (chemin avec espaces). call lance le .bat en mode server.
start "Bipper Web - Serveur" /D "%ROOT%" cmd /k call "%~f0" server

call :WaitForPort 3000 90
if errorlevel 1 (
    echo [AVERTISSEMENT] Le serveur met du temps a demarrer.
    echo Ouvrez manuellement : http://localhost:3000
    pause
    exit /b 1
)

echo  Ouverture du navigateur...
start "" "http://localhost:3000/"
echo.
echo  Application disponible sur http://localhost:3000/
echo  Parametrage Bipper : http://localhost:3000/settings/bipper
echo  Envoi alerte : http://localhost:3000/alerts
echo.
echo  Fermez la fenetre "Bipper Web - Serveur" pour arreter le serveur.
echo.
pause
exit /b 0

:Server
rem In a subroutine, percent-star is the script args, not call args.
call :RunPnpm --filter meshtastic-web dev
echo.
echo  Le serveur s'est arrete.
pause
exit /b 0

:RunPnpm
where pnpm >nul 2>&1
if not errorlevel 1 (
    pnpm %1 %2 %3 %4 %5 %6 %7 %8 %9
    exit /b %ERRORLEVEL%
)
call npx --yes pnpm@11.9.0 %1 %2 %3 %4 %5 %6 %7 %8 %9
exit /b %ERRORLEVEL%

:WaitForPort
set "PORT=%~1"
set "MAX_SEC=%~2"
if "%MAX_SEC%"=="" set "MAX_SEC=60"
set /a "TRIES=0"
:WaitLoop
powershell -NoProfile -Command "try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', %PORT%); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 exit /b 0
set /a "TRIES+=1"
if %TRIES% GEQ %MAX_SEC% exit /b 1
timeout /t 1 /nobreak >nul
goto :WaitLoop
