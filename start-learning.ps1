param(
  [int]$WebPort = 8787,
  [int]$ProxyPort = 8799,
  [string]$LocalModel = "deepseek-r1:8b",
  [switch]$PullModel
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Http($Url) {
  try {
    return Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 3
  } catch {
    return $null
  }
}

function Test-PortFree($Port) {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Parse("127.0.0.1"), $Port)
  try {
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    try { $listener.Stop() } catch {}
  }
}

function Start-IfDown($Name, $HealthUrl, $File, $ArgsList) {
  if (Test-Http $HealthUrl) {
    Write-Host "$Name already running: $HealthUrl" -ForegroundColor Green
    return
  }

  Write-Host "Starting $Name..." -ForegroundColor Yellow
  Start-Process -FilePath $File -ArgumentList $ArgsList -WorkingDirectory $Root -WindowStyle Hidden | Out-Null
  Start-Sleep -Milliseconds 1200

  if (Test-Http $HealthUrl) {
    Write-Host "$Name is ready: $HealthUrl" -ForegroundColor Green
  } else {
    Write-Host "$Name did not answer yet: $HealthUrl" -ForegroundColor Yellow
  }
}

function Stop-PortOwner($Port) {
  $owners = @()
  try {
    $owners += Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
  } catch {}

  if (-not $owners) {
    try {
      $owners += netstat -ano |
        Select-String ":$Port\s" |
        ForEach-Object {
          $parts = ($_ -replace "^\s+", "") -split "\s+"
          if ($parts.Length -ge 5 -and $parts[1] -like "*:$Port") { [int]$parts[4] }
        } |
        Select-Object -Unique
    } catch {}
  }

  foreach ($owner in $owners) {
    if ($owner -and $owner -ne $PID) {
      try {
        Stop-Process -Id $owner -ErrorAction Stop
      } catch {
        Write-Host "Could not stop PID $owner on port $Port. Close it manually if restart is needed." -ForegroundColor Yellow
      }
    }
  }
}

function Find-OllamaExe {
  if ($env:OLLAMA_EXE -and (Test-Path $env:OLLAMA_EXE)) {
    return $env:OLLAMA_EXE
  }

  $cmd = Get-Command ollama -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }

  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe",
    "$env:USERPROFILE\AppData\Local\Programs\Ollama\ollama.exe",
    "C:\Users\34574\AppData\Local\Programs\Ollama\ollama.exe",
    "D:\Program Files\Ollama\ollama.exe",
    "D:\Program Files (x86)\Ollama\ollama.exe",
    "D:\Ollama\ollama.exe"
  )

  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  try {
    $shell = New-Object -ComObject WScript.Shell
    $links = Get-ChildItem -Path "$env:APPDATA\Microsoft\Windows\Start Menu\Programs" -Filter "*Ollama*.lnk" -Recurse -ErrorAction SilentlyContinue
    foreach ($link in $links) {
      $shortcut = $shell.CreateShortcut($link.FullName)
      $dir = $shortcut.WorkingDirectory
      if ($dir) {
        $exe = Join-Path $dir "ollama.exe"
        if (Test-Path $exe) {
          return $exe
        }
      }
    }
  } catch {}

  return $null
}

function Get-OllamaModels {
  $tags = Test-Http "http://127.0.0.1:11434/api/tags"
  if (-not $tags) {
    return $null
  }
  try {
    return @((($tags.Content | ConvertFrom-Json).models | ForEach-Object { $_.name }))
  } catch {
    return @()
  }
}

Write-Step "Checking Node.js"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js was not found. Install Node.js 18+ first."
}
Write-Host "Node: $(node --version)" -ForegroundColor Green

$env:LOCAL_MODEL = $LocalModel
if (-not $env:AI_PROVIDER) { $env:AI_PROVIDER = "deepseek" }

Write-Step "Checking local model runtime: Ollama + $LocalModel"
$ollama = Find-OllamaExe
$modelNames = Get-OllamaModels
if ($null -eq $modelNames) {
  if (-not $ollama) {
    Write-Host "Ollama was not found. Local DeepSeek 8B will be unavailable." -ForegroundColor Yellow
    Write-Host "Install it from: https://ollama.com/download/windows"
  } else {
    Write-Host "Starting Ollama service..." -ForegroundColor Yellow
    Start-Process -FilePath $ollama -ArgumentList @("serve") -WindowStyle Hidden | Out-Null
    for ($i = 0; $i -lt 12 -and $null -eq $modelNames; $i += 1) {
      Start-Sleep -Milliseconds 800
      $modelNames = Get-OllamaModels
    }
  }
}

if ($null -ne $modelNames) {
  Write-Host "Ollama API is reachable: http://127.0.0.1:11434" -ForegroundColor Green
  $hasModel = $modelNames | Where-Object { $_ -eq $LocalModel -or $_ -like "$LocalModel`:*" }

  if (-not $hasModel -and $PullModel) {
    if ($ollama) {
      Write-Host "Pulling $LocalModel. First download can take a while..." -ForegroundColor Yellow
      & $ollama pull $LocalModel
      $modelNames = Get-OllamaModels
      $hasModel = $modelNames | Where-Object { $_ -eq $LocalModel -or $_ -like "$LocalModel`:*" }
    } elseif (-not $hasModel) {
      Write-Host "Model missing. Run: ollama pull $LocalModel" -ForegroundColor Yellow
    }
  }

  if ($hasModel) {
    Write-Host "Local model is ready: $LocalModel" -ForegroundColor Green
  } else {
    Write-Host "Model missing. Run: ollama pull $LocalModel" -ForegroundColor Yellow
  }
} else {
  Write-Host "Ollama service is not reachable at http://127.0.0.1:11434" -ForegroundColor Yellow
}

Write-Step "Starting web app"
if (-not (Test-PortFree $WebPort) -and -not (Test-Http "http://127.0.0.1:$WebPort/index.html")) {
  Write-Host "Port $WebPort is in use by another app. Try: powershell -File start-learning.ps1 -WebPort 8788" -ForegroundColor Yellow
} else {
  Start-IfDown "Web app" "http://127.0.0.1:$WebPort/index.html" "node" @("dev-server.mjs", "$WebPort")
}

Write-Step "Starting AI proxy"
$existingProxyHealth = Test-Http "http://127.0.0.1:$ProxyPort/health"
if ($existingProxyHealth) {
  try {
    $existingProxy = $existingProxyHealth.Content | ConvertFrom-Json
    if ($existingProxy.providers.local.model -ne $LocalModel) {
      Write-Host "Restarting AI proxy to switch local model to $LocalModel..." -ForegroundColor Yellow
      Stop-PortOwner $ProxyPort
      Start-Sleep -Milliseconds 800
    }
  } catch {}
}
$env:PORT = "$ProxyPort"
Start-IfDown "AI proxy" "http://127.0.0.1:$ProxyPort/health" "node" @("proxy/ai-proxy.mjs")

Write-Step "Current AI proxy health"
$health = Test-Http "http://127.0.0.1:$ProxyPort/health"
if ($health) {
  Write-Host $health.Content
} else {
  Write-Host "AI proxy health check failed." -ForegroundColor Red
}

Write-Step "Ready"
Write-Host "Open: http://127.0.0.1:$WebPort/" -ForegroundColor Green
Write-Host "Local model target: $LocalModel"
Start-Process "http://127.0.0.1:$WebPort/"
