@echo off
setlocal EnableDelayedExpansion
title Saltum Billing ^& Stock
cd /d "%~dp0.."

echo.
echo ========================================
echo   Saltum - Starting...
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js is not installed.
  echo Download Node.js 20 LTS from https://nodejs.org/
  pause
  exit /b 1
)

if not exist "backend\.env" (
  echo ERROR: backend\.env is missing.
  echo Run install\install-customer.ps1 first.
  pause
  exit /b 1
)

if not exist "backend\node_modules" (
  echo ERROR: Backend packages are not installed.
  echo Run install\install-customer.ps1 first.
  pause
  exit /b 1
)

if not exist "frontend\node_modules" (
  echo ERROR: Frontend packages are not installed.
  echo Run install\install-customer.ps1 first.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%p in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0get-app-port.ps1"`) do set "APP_PORT=%%p"
if not defined APP_PORT set "APP_PORT=8888"

echo Stopping any existing Saltum server on port %APP_PORT%...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /C:":%APP_PORT% " ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>&1
)

sc query MongoDB >nul 2>&1
if not errorlevel 1 (
  net start MongoDB >nul 2>&1
)

echo.
echo Building frontend with latest code...
cd frontend
if exist dist rmdir /s /q dist
call npm run build
if errorlevel 1 (
  echo.
  echo ERROR: Frontend build failed. See messages above.
  cd ..
  pause
  exit /b 1
)
cd ..

cd backend
set NODE_ENV=production
set SERVE_FRONTEND=true

echo.
echo Starting server at http://localhost:%APP_PORT%
echo Keep this window open while using Saltum.
echo Press Ctrl+C to stop the app.
echo.

start /B powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0wait-and-open-browser.ps1" -Port %APP_PORT%

npm start
set "EXIT_CODE=!ERRORLEVEL!"

if not "!EXIT_CODE!"=="0" (
  echo.
  echo ERROR: Server failed to start ^(exit code !EXIT_CODE!^).
  echo.
  echo Common fixes:
  echo   1. Start MongoDB service in services.msc
  echo   2. Check DATABASE in backend\.env ^(local or Atlas^)
  echo   3. Close any app already using port %APP_PORT%
  echo   4. Re-run install\install-customer.ps1
  echo.
)

pause
exit /b !EXIT_CODE!
