# One-time / occasional toolchain setup for Windows (PowerShell 7+).
# Run from repo root:  pwsh ./scripts/setup-dev.ps1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

function Resolve-NodeDir {
  Refresh-Path
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if (-not $cmd) { return $null }
  Split-Path $cmd.Source -Parent
}

$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

Refresh-Path
$nodeDir = Resolve-NodeDir
if (-not $nodeDir) {
  Write-Host @"

Node.js was not found on PATH.

1. Install Node.js LTS (adds node, npm, and corepack.cmd next to node.exe):
     winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements

2. If winget hangs on "Waiting for another install to complete", open Task Manager,
   end any stuck "Windows Installer" or other MSI setup, then run winget again.

3. Close this terminal, open a NEW PowerShell window (PATH is refreshed on new sessions),
   cd to this repo, and run:
     pwsh ./scripts/setup-dev.ps1

Or download the LTS installer from https://nodejs.org and enable "Add to PATH".

"@
  exit 1
}

$corepack = Join-Path $nodeDir "corepack.cmd"
if (-not (Test-Path $corepack)) {
  Write-Error "corepack.cmd not found at $corepack . Repair or reinstall Node.js LTS from https://nodejs.org"
  exit 1
}

Write-Host "Using Node from: $nodeDir"
& $corepack enable
& $corepack prepare pnpm@9.15.9 --activate

Refresh-Path

$pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if (-not $pnpm) {
  Write-Error "pnpm still not on PATH after corepack. Close the terminal, open a new one, cd to the repo, and run this script again."
  exit 1
}

Write-Host "pnpm $(pnpm --version)"
pnpm install
Write-Host ""
Write-Host "Next: pnpm dev   or   npm run dev"
