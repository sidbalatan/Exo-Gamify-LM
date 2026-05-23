# Applies database/workspace_ddl.sql via Docker or psql when available.
# Usage (from repo root): pwsh ./scripts/apply-workspace-ddl.ps1

param(
  [string]$DockerContainer = "xquest-postgres-local",
  [int]$HostPort = 5433,
  [string]$Password = "postgres",
  [string]$Database = "xquest"
)

$ErrorActionPreference = "Stop"

$ddl = Join-Path $PSScriptRoot "../database/workspace_ddl.sql"
if (!(Test-Path $ddl)) {
  throw "DDL file not found: $ddl"
}

function Invoke-DdlWithDocker {
  docker rm -f $DockerContainer 2>$null | Out-Null
  docker run -d `
    --name $DockerContainer `
    -e "POSTGRES_PASSWORD=$Password" `
    -e "POSTGRES_DB=$Database" `
    -p "${HostPort}:5432" `
    postgres:16-alpine | Out-Null

  $deadline = (Get-Date).AddMinutes(2)
  do {
    $logs = docker logs $DockerContainer 2>&1 | Out-String
    if ($logs -match "database system is ready to accept connections") {
      break
    }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)

  Get-Content $ddl -Raw | docker exec -i $DockerContainer `
    psql -v ON_ERROR_STOP=1 -U postgres -d $Database

  Write-Host ""
  Write-Host "PostgreSQL is running in Docker:"
  Write-Host ("  DATABASE_URL=postgresql://postgres:{0}@localhost:{1}/{2}" -f $Password, $HostPort, $Database)
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host "Applying DDL with Docker (container: $DockerContainer)..."
  Invoke-DdlWithDocker
  exit 0
}

if (Get-Command psql -ErrorAction SilentlyContinue) {
  if (-not $env:DATABASE_URL) {
    Write-Host "psql is installed but DATABASE_URL is not set."
    Write-Host "Example:"
    Write-Host '  $env:DATABASE_URL = "postgresql://user:pass@localhost:5432/xquest"'
    Write-Host "  psql `$env:DATABASE_URL -f `"$ddl`""
    exit 2
  }
  psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f $ddl
  exit 0
}

Write-Host @"

Could not apply DDL: Docker and psql were not found on PATH.

Choose one:
  1) Install Docker Desktop, then re-run:  pwsh ./scripts/apply-workspace-ddl.ps1
  2) Install PostgreSQL (includes psql), set DATABASE_URL, then:
       psql `$env:DATABASE_URL -f `"$ddl`"

DDL file: $ddl
"@
exit 1
