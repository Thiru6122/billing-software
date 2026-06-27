$envFile = Join-Path (Split-Path -Parent $PSScriptRoot) "backend\.env"
$port = "8888"

if (Test-Path $envFile) {
  $line = Get-Content $envFile | Where-Object { $_ -match '^\s*PORT\s*=' } | Select-Object -First 1
  if ($line) {
    $value = ($line -split '=', 2)[1].Trim().Trim('"', "'")
    if ($value) { $port = $value }
  }
}

Write-Output $port
