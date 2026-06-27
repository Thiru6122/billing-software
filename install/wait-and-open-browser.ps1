param(
  [int]$Port = 8888,
  [int]$TimeoutSeconds = 60
)

$url = "http://127.0.0.1:$Port"

for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
  try {
    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
    Start-Process "http://localhost:$Port"
    exit 0
  } catch {
    Start-Sleep -Seconds 1
  }
}

Write-Host "Browser not opened - server did not respond within $TimeoutSeconds seconds."
exit 1
