@echo off
title Saltum Database Backup
cd /d "%~dp0.."

set BACKUP_ROOT=%USERPROFILE%\Documents\SaltumBackups
set STAMP=%date:~-4,4%-%date:~-10,2%-%date:~-7,2%_%time:~0,2%%time:~3,2%
set STAMP=%STAMP: =0%
set OUT=%BACKUP_ROOT%\%STAMP%

where mongodump >nul 2>&1
if errorlevel 1 (
  echo mongodump not found. Install MongoDB Database Tools:
  echo https://www.mongodb.com/try/download/database-tools
  pause
  exit /b 1
)

if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%"

echo Backing up database "saltum" to:
echo %OUT%
mongodump --db saltum --out "%OUT%"

if errorlevel 1 (
  echo Backup failed. If your database name is different, edit this script.
  pause
  exit /b 1
)

echo.
echo Backup completed successfully.
pause
