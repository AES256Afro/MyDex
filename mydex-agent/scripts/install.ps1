# MyDex Agent Installer for Windows
# Usage: .\install.ps1 -ApiKey "mdx_xxxxx" [-ServerUrl "https://antifascist.work"]
# Deploy via: Intune (Win32 app), SCCM, or GPO

param(
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,

    [string]$ServerUrl = "https://antifascist.work",

    [string]$InstallDir = "$env:ProgramFiles\MyDex"
)

$ErrorActionPreference = "Stop"

Write-Host "MyDex Agent Installer" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This installer must be run as Administrator"
    exit 1
}

# Create install directory
Write-Host "Creating install directory: $InstallDir"
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

# Copy binary
$binarySource = Join-Path $PSScriptRoot "..\dist\windows\mydex-agent.exe"
if (-not (Test-Path $binarySource)) {
    Write-Error "Binary not found at $binarySource. Run 'make windows' first."
    exit 1
}

Write-Host "Copying agent binary..."
Copy-Item $binarySource "$InstallDir\mydex-agent.exe" -Force

# Create config directory
$configDir = "$env:ProgramData\MyDex"
New-Item -ItemType Directory -Path $configDir -Force | Out-Null

# Write config
$config = @{
    serverUrl = $ServerUrl
    apiKey = $ApiKey
    heartbeatInterval = 60
    processInterval = 60
    softwareInterval = 1800
    systemStateInterval = 300
    networkInterval = 30
    dnsEnabled = $true
    usbMonitoring = $true
    reportingInterval = 300
    policyPollInterval = 60
    commandPollInterval = 30
} | ConvertTo-Json

Write-Host "Writing configuration..."
$config | Set-Content "$configDir\config.json" -Encoding UTF8

# Set restrictive permissions on config (contains API key)
$acl = Get-Acl "$configDir\config.json"
$acl.SetAccessRuleProtection($true, $false)
$adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule("BUILTIN\Administrators", "FullControl", "Allow")
$systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule("NT AUTHORITY\SYSTEM", "FullControl", "Allow")
$acl.AddAccessRule($adminRule)
$acl.AddAccessRule($systemRule)
Set-Acl "$configDir\config.json" $acl

# Install as Windows service
Write-Host "Installing Windows service..."
& "$InstallDir\mydex-agent.exe" --install

# Start the service
Write-Host "Starting MyDex Agent service..."
Start-Service -Name "MyDexAgent"

# Verify
$svc = Get-Service -Name "MyDexAgent" -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Host ""
    Write-Host "MyDex Agent installed and running!" -ForegroundColor Green
    Write-Host "  Service: MyDexAgent"
    Write-Host "  Binary:  $InstallDir\mydex-agent.exe"
    Write-Host "  Config:  $configDir\config.json"
    Write-Host "  Server:  $ServerUrl"
} else {
    Write-Warning "Service installed but may not be running. Check: Get-Service MyDexAgent"
}
