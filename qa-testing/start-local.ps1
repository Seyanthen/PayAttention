[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot "backend"
$mobileDir = Join-Path $projectRoot "mobile-ui\TeamApp"
$backendEnv = Join-Path $backendDir ".env"
$mobileEnv = Join-Path $mobileDir ".env"
$backendPython = Join-Path $backendDir ".venv\Scripts\python.exe"

function Get-LocalNetworkAddress {
    $configurations = Get-NetIPConfiguration |
        Where-Object {
            $_.IPv4Address -and
            $_.IPv4DefaultGateway -and
            $_.NetAdapter.Status -eq "Up"
        }

    $addresses = foreach ($configuration in $configurations) {
        foreach ($address in $configuration.IPv4Address) {
            $ip = $address.IPAddress
            if ($ip -and $ip -notlike "127.*" -and $ip -notlike "169.254.*") {
                $ip
            }
        }
    }

    $selected = $addresses | Select-Object -First 1
    if (-not $selected) {
        throw "Could not find an active LAN or hotspot IPv4 address. Connect to a network and try again."
    }

    return $selected
}

function Set-EnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value
    )

    $lines = if (Test-Path $Path) {
        @(Get-Content -LiteralPath $Path)
    } else {
        @()
    }

    $pattern = "^\s*" + [regex]::Escape($Name) + "\s*="
    $replacement = "$Name=$Value"
    $found = $false
    $updated = foreach ($line in $lines) {
        if ($line -match $pattern) {
            $found = $true
            $replacement
        } else {
            $line
        }
    }

    if (-not $found) {
        $updated += $replacement
    }

    Set-Content -LiteralPath $Path -Value $updated -Encoding utf8
}

if (-not (Test-Path $mobileDir)) {
    throw "Mobile app directory was not found: $mobileDir"
}

if (-not (Test-Path $backendDir)) {
    throw "Backend directory was not found: $backendDir"
}

$localIp = Get-LocalNetworkAddress
Write-Host "Using local network address: $localIp" -ForegroundColor Cyan

Set-EnvValue -Path $mobileEnv -Name "EXPO_PUBLIC_API_BASE_URL" -Value "http://${localIp}:8000/api/v1"
Set-EnvValue -Path $backendEnv -Name "DJANGO_ALLOWED_HOSTS" -Value "localhost,127.0.0.1,$localIp"

if (Test-Path $backendPython) {
    $pythonCommand = $backendPython
} else {
    $pythonCommand = "python.exe"
}

Write-Host "Starting Django API..." -ForegroundColor Green
Start-Process -FilePath $pythonCommand `
    -ArgumentList @("manage.py", "runserver", "0.0.0.0:8000") `
    -WorkingDirectory $backendDir

Write-Host "Starting Expo..." -ForegroundColor Green
Start-Process -FilePath "npm.cmd" `
    -ArgumentList @("start") `
    -WorkingDirectory $mobileDir

Write-Host "Django and Expo are starting in separate windows." -ForegroundColor Green
Write-Host "API URL: http://${localIp}:8000/api/v1" -ForegroundColor Cyan
