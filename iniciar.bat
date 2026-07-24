@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%"

if not exist "package.json" (
  echo [ERROR] No se encontro package.json en:
  echo %ROOT%
  pause
  exit /b 1
)

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta disponible en el PATH.
  pause
  exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm no esta disponible en el PATH.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [ERROR] No existe node_modules.
  echo Ejecuta npm install antes de iniciar los servicios.
  pause
  exit /b 1
)

echo Iniciando BackCosaif...
start "BackCosaif API" cmd.exe /k "cd /d ""%ROOT%"" && npm.cmd run dev"

timeout /t 2 /nobreak >nul

echo Iniciando msTorno...
start "msTorno API" cmd.exe /k "cd /d ""%ROOT%"" && npm.cmd run dev:torno"

timeout /t 2 /nobreak >nul

echo Iniciando msLavado...
start "msLavado API" cmd.exe /k "cd /d ""%ROOT%"" && npm.cmd run dev:lavado"

echo.
echo Servicios lanzados:
echo   BackCosaif: puerto configurado en .env
echo   msTorno:    TORNO_PORT configurado o puerto 3001
echo   msLavado:   LAVADO_PORT configurado o puerto 3004
echo.

endlocal
