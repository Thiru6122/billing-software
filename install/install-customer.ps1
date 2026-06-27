# Saltum customer PC installer (Windows)
# Run from project root: powershell -ExecutionPolicy Bypass -File .\install\install-customer.ps1
# Optional: -NonInteractive (used by start-saltum.bat when frontend is missing)

param(
  [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $ProjectRoot "backend"
$FrontendDir = Join-Path $ProjectRoot "frontend"
$MarkerFile = Join-Path $ProjectRoot ".saltum-installed"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Saltum - Customer PC Installation" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Test-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command node)) {
  Write-Host "ERROR: Node.js is not installed." -ForegroundColor Red
  Write-Host "Download Node.js 20 LTS from https://nodejs.org/" -ForegroundColor Yellow
  exit 1
}

$nodeVersion = (node -v) -replace 'v', ''
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 20) {
  Write-Host "ERROR: Node.js 20 or newer is required (found $(node -v))." -ForegroundColor Red
  exit 1
}

Write-Host "[OK] Node.js $(node -v)" -ForegroundColor Green

$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoService) {
  if ($mongoService.Status -ne "Running") {
    Write-Host "Starting MongoDB service..." -ForegroundColor Yellow
    Start-Service MongoDB
  }
  Write-Host "[OK] MongoDB service is running" -ForegroundColor Green
} else {
  Write-Host "WARNING: MongoDB Windows service not found." -ForegroundColor Yellow
  Write-Host "Install MongoDB Community Server and run this script again." -ForegroundColor Yellow
  Write-Host "https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
  if ($NonInteractive) {
    Write-Host "Continuing without local MongoDB (using DATABASE from backend\.env)..." -ForegroundColor Yellow
  } else {
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") { exit 1 }
  }
}

# Backend .env
$envFile = Join-Path $BackendDir ".env"
$envExample = Join-Path $BackendDir ".env.example"
if (-not (Test-Path $envFile)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envFile
    Write-Host "[OK] Created backend\.env from .env.example" -ForegroundColor Green
  } else {
    Write-Host "ERROR: backend\.env.example not found." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "[OK] backend\.env already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Installing backend packages..." -ForegroundColor Cyan
Push-Location $BackendDir
npm install
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }

if (-not (Test-Path $MarkerFile)) {
  Write-Host ""
  Write-Host "First-time setup: creating store and admin user..." -ForegroundColor Cyan
  npm run setup
  if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
  Set-Content -Path $MarkerFile -Value (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
  Write-Host "[OK] Database initialized" -ForegroundColor Green
} else {
  Write-Host "[OK] Database already initialized (skipping setup)" -ForegroundColor Green
}
Pop-Location

Write-Host ""
Write-Host "Installing frontend packages..." -ForegroundColor Cyan
Push-Location $FrontendDir
npm install
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }

Write-Host ""
Write-Host "Building production web app..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Start the app: double-click install\start-saltum.bat" -ForegroundColor White
Write-Host ""
Write-Host "First login:" -ForegroundColor Yellow
Write-Host "  Store:    main" -ForegroundColor White
Write-Host "  Email:    admin@admin.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Change the password after first login (Profile page)." -ForegroundColor Yellow
Write-Host ""
