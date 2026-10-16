@echo off
setlocal EnableExtensions DisableDelayedExpansion
title COSMODROMO - Build portable Windows app
cd /d "%~dp0"
set "COSMO_ROOT=%~dp0"
set "NODE_PATH_FILE=%COSMO_ROOT%node-path.txt"
set "NODE_EXE="
echo COSMODROMO - Build portable Windows executable
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%COSMO_ROOT%Preparar_Entorno.ps1" -SkipFirewall
if errorlevel 1 goto prepare_failed
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
echo.
echo Installing build dependencies...
call "%NODE_DIR%npm.cmd" install --no-audit --no-fund
if errorlevel 1 goto npm_failed
echo.
echo Building portable executable...
call "%NODE_DIR%npm.cmd" run dist
if errorlevel 1 goto build_failed
echo.
echo DONE: check the dist folder.
pause
exit /b 0
:prepare_failed
echo Node.js preparation failed.
pause
exit /b 1
:node_not_found
echo Node.js could not be found after setup.
pause
exit /b 1
:npm_not_found
echo npm.cmd was not found beside Node.js.
pause
exit /b 1
:npm_failed
echo npm install failed.
pause
exit /b 1
:build_failed
echo Build failed. Review the messages above.
pause
exit /b 1
