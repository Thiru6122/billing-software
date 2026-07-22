@echo off
setlocal EnableDelayedExpansion
title Saltum Billing ^& Stock
cd /d "%~dp0.."

set "ROOT=%CD%"

echo.
echo ========================================
echo   Saltum - Starting application
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Download Node.js 20 LTS from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "%ROOT%\backend\.env" (
  echo ERROR: backend\.env is missing.
  echo Run install\install-customer.ps1 first.
  pause
  exit /b 1
)

if not exist "%ROOT%\backend\node_modules" (
  echo ERROR: Backend packages are not installed.
  echo Run install\install-customer.ps1 first.
  pause
  exit /b 1
)

if not exist "%ROOT%\frontend\node_modules" (
  echo ERROR: Frontend packages are not installed.
  echo Run install\install-customer.ps1 first.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%p in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0get-app-port.ps1"`) do set "APP_PORT=%%p"
if not defined APP_PORT set "APP_PORT=8888"

echo Stopping any existing Saltum server on port %APP_PORT%...
call :KillPort %APP_PORT%
call :KillPort 3000

sc query MongoDB >nul 2>&1
if not errorlevel 1 (
  net start MongoDB >nul 2>&1
)

echo.
echo [1/2] Building frontend...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 (
  echo.
  echo ERROR: Frontend build failed. See messages above.
  cd /d "%ROOT%"
  pause
  exit /b 1
)
cd /d "%ROOT%"

echo.
echo [2/2] Starting Saltum server...
cd /d "%ROOT%\backend"
set NODE_ENV=production
set SERVE_FRONTEND=true

echo.
echo   App URL:  http://localhost:%APP_PORT%
echo   Browser will open automatically when ready.
echo   Keep this window open while using Saltum.
echo   Press Ctrl+C to stop the application.
echo.

start /B powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0wait-and-open-browser.ps1" -Port %APP_PORT%

call npm start
set "EXIT_CODE=!ERRORLEVEL!"
cd /d "%ROOT%"

if not "!EXIT_CODE!"=="0" (
  echo.
  echo ERROR: Saltum failed to start ^(exit code !EXIT_CODE!^).
  echo.
  echo Common fixes:
  echo   1. Check DATABASE in backend\.env ^(local MongoDB or Atlas^)
  echo   2. Close any app already using port %APP_PORT%
  echo   3. Re-run install\install-customer.ps1
  echo.
)

pause
exit /b !EXIT_CODE!

:KillPort
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /C:":%1 " ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>&1
)
exit /b 0
