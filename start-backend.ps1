# Start Backend Server
cd "$PSScriptRoot"
$env:PORT = "3000"
$env:NODE_ENV = "development"
Write-Host "🚀 Starting backend server on port 3000..."
pnpm dev:server

