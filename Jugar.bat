@echo off
setlocal EnableExtensions DisableDelayedExpansion
title COSMODROMO - Automatic setup and game
cd /d "%~dp0"
set "COSMO_ROOT=%~dp0"
set "NODE_PATH_FILE=%COSMO_ROOT%node-path.txt"
set "NODE_EXE="
set "PORT="

echo.
echo  ======================================================
echo       COSMODROMO - ONE CLICK START
echo  ======================================================
echo.
echo Preparing Node.js, game dependencies and local network.
echo The first run downloads official components and may take a few minutes.
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%COSMO_ROOT%Preparar_Entorno.ps1"
if errorlevel 1 goto prepare_failed

REM Prefer portable Node.js in this folder; do not depend on node-path.txt existing.
if exist "%COSMO_ROOT%runtime\node\node.exe" set "NODE_EXE=%COSMO_ROOT%runtime\node\node.exe"
if not defined NODE_EXE if exist "%NODE_PATH_FILE%" set /p "NODE_EXE="<"%NODE_PATH_FILE%"
if defined NODE_EXE if not exist "%NODE_EXE%" set "NODE_EXE="
if not defined NODE_EXE (
  for /f "delims=" %%N in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%N"
)
if not defined NODE_EXE goto node_not_found
if not exist "%NODE_EXE%" goto node_not_found

for %%I in ("%NODE_EXE%") do set "NODE_DIR=%%~dpI"
if not exist "%NODE_DIR%npm.cmd" goto npm_not_found
set "PATH=%NODE_DIR%;%PATH%"
set "npm_config_audit=false"
set "npm_config_fund=false"
set "npm_config_cache=%COSMO_ROOT%.cache\npm"

if not exist "%COSMO_ROOT%node_modules\ws\package.json" (
  echo.
  echo Installing game dependencies automatically...
  call "%NODE_DIR%npm.cmd" install --omit=dev --ignore-scripts --no-audit --no-fund
  if errorlevel 1 goto npm_install_failed
)

if exist "%COSMO_ROOT%server-port.txt" del /q "%COSMO_ROOT%server-port.txt" >nul 2>nul
start "Servidor Cosmodromo" /D "%COSMO_ROOT%" "%NODE_EXE%" "%COSMO_ROOT%server.js"
set "WAIT_COUNT=0"
:wait_server
if exist "%COSMO_ROOT%server-port.txt" goto server_ready
set /a WAIT_COUNT+=1
if %WAIT_COUNT% GEQ 30 goto server_failed
timeout /t 1 /nobreak >nul
goto wait_server

:server_ready
set /p "GAME_PORT="<"%COSMO_ROOT%server-port.txt"
start "" "http://localhost:%GAME_PORT%"
echo.
echo  ======================================================
echo  COSMODROMO IS RUNNING
echo  ======================================================
echo.
echo On this PC: http://localhost:%GAME_PORT%
echo.
echo TO PLAY FROM YOUR PHONE:
echo  1. Connect the phone to the same Wi-Fi as this PC.
echo  2. In the "Servidor Cosmodromo" window, find the URL with your PC IP.
echo  3. Open that complete URL on the phone. Do not use localhost on the phone.
echo  4. If needed, allow node.exe on private networks in Windows Firewall.
echo.
echo Keep the "Servidor Cosmodromo" window open while playing.
echo Press any key to close this instruction window.
pause >nul
exit /b 0

:prepare_failed
echo.
echo Automatic setup failed. Review the PowerShell error above and retry.
pause
exit /b 1

:node_not_found
echo.
echo Node.js could not be located after setup.
echo Expected: "%COSMO_ROOT%runtime\node\node.exe"
echo You can retry by running this file again.
pause
exit /b 1

:npm_not_found
echo.
echo npm.cmd was not found beside the selected Node.js executable:
echo "%NODE_EXE%"
pause
exit /b 1

:npm_install_failed
echo.
echo npm could not install the game dependencies. Check the internet connection and retry.
pause
exit /b 1

:server_failed
echo.
echo The server did not start within 30 seconds.
echo Review the "Servidor Cosmodromo" window for details.
pause
exit /b 1
