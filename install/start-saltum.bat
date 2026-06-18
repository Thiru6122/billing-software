@echo off
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
  echo Download from https://nodejs.org/
  pause
  exit /b 1
)

sc query MongoDB >nul 2>&1
if not errorlevel 1 (
  net start MongoDB >nul 2>&1
)

if not exist "frontend\dist\index.html" (
  echo Frontend not built yet. Running installer...
  powershell -ExecutionPolicy Bypass -File "%~dp0install-customer.ps1"
  if errorlevel 1 pause & exit /b 1
)

if not exist "backend\.env" (
  echo ERROR: backend\.env is missing. Run install\install-customer.ps1 first.
  pause
  exit /b 1
)

cd backend
set NODE_ENV=production
set SERVE_FRONTEND=true

echo Opening browser at http://localhost:8888
echo Keep this window open while using Saltum.
echo Press Ctrl+C to stop the app.
echo.

start "" http://localhost:8888
npm start

pause
