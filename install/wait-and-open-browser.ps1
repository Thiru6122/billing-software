param(
  [int]$Port = 8888,
  [int]$TimeoutSeconds = 120
)

$url = "http://localhost:$Port"

function Test-PortOpen {
  param([int]$TargetPort)
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $connect = $client.BeginConnect('127.0.0.1', $TargetPort, $null, $null)
    $ready = $connect.AsyncWaitHandle.WaitOne(800, $false)
    if ($ready -and $client.Connected) {
      $client.EndConnect($connect)
      return $true
    }
  } catch {
    # Port not open yet
  } finally {
    $client.Close()
  }
  return $false
}

for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
  if (Test-PortOpen -TargetPort $Port) {
    Start-Sleep -Seconds 2
    try {
      Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 | Out-Null
    } catch {
      # Server socket is open; open browser even if first HTTP probe fails
    }
    Start-Process $url
    exit 0
  }
  Start-Sleep -Seconds 1
}

Write-Host "Browser not opened - Saltum did not start on port $Port within $TimeoutSeconds seconds."
exit 1
