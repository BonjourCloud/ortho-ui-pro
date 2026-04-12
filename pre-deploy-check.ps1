# Pre-Deployment Checklist Script (PowerShell)
# Run this before deploying to Vercel to catch common issues

Write-Host "🔍 Pre-Deployment Checklist for Ortho UI Pro" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
Write-Host "1. Checking .env file..."
if (Test-Path .env) {
    Write-Host "✓ .env file exists" -ForegroundColor Green
    
    # Check if it contains the placeholder values
    $envContent = Get-Content .env -Raw
    if ($envContent -match "your-project-ref-here") {
        Write-Host "✗ .env still contains placeholder values!" -ForegroundColor Red
        Write-Host "   Update .env with your actual Supabase credentials" -ForegroundColor Yellow
    } else {
        Write-Host "✓ .env appears to be configured" -ForegroundColor Green
    }
} else {
    Write-Host "✗ .env file not found!" -ForegroundColor Red
    Write-Host "   Copy .env.example to .env and add your credentials" -ForegroundColor Yellow
}
Write-Host ""

# Check if node_modules exists
Write-Host "2. Checking dependencies..."
if (Test-Path node_modules) {
    Write-Host "✓ node_modules exists" -ForegroundColor Green
} else {
    Write-Host "! node_modules not found. Run: npm install" -ForegroundColor Yellow
}
Write-Host ""

# Check if build works
Write-Host "3. Testing build..."
try {
    $buildOutput = npm run build 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Build successful" -ForegroundColor Green
        
        # Check if dist folder was created
        if (Test-Path dist) {
            Write-Host "✓ dist folder created" -ForegroundColor Green
        }
    } else {
        Write-Host "✗ Build failed! Check errors above" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Build failed! $_" -ForegroundColor Red
}
Write-Host ""

# Check vercel.json
Write-Host "4. Checking Vercel configuration..."
if (Test-Path vercel.json) {
    Write-Host "✓ vercel.json exists" -ForegroundColor Green
} else {
    Write-Host "✗ vercel.json not found!" -ForegroundColor Red
}
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "5. Checking Supabase CLI..."
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "✓ Supabase CLI installed" -ForegroundColor Green
    Write-Host "   $supabaseVersion" -ForegroundColor Gray
} catch {
    Write-Host "! Supabase CLI not installed" -ForegroundColor Yellow
    Write-Host "   Install with: npm install -g supabase" -ForegroundColor Yellow
}
Write-Host ""

# Check if migrations exist
Write-Host "6. Checking database migrations..."
if (Test-Path supabase/migrations) {
    $migrationCount = (Get-ChildItem supabase/migrations/*.sql -ErrorAction SilentlyContinue).Count
    Write-Host "✓ Found $migrationCount migration files" -ForegroundColor Green
} else {
    Write-Host "✗ supabase/migrations folder not found!" -ForegroundColor Red
}
Write-Host ""

# Check if edge functions exist
Write-Host "7. Checking edge functions..."
if (Test-Path supabase/functions/assign-admin-role) {
    Write-Host "✓ assign-admin-role function exists" -ForegroundColor Green
} else {
    Write-Host "✗ Edge function not found!" -ForegroundColor Red
}
Write-Host ""

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Pre-deployment check complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Fix any issues marked with ✗ or !"
Write-Host "2. Follow MIGRATION_CHECKLIST.md for full deployment"
Write-Host "3. Push to GitHub and connect to Vercel"
Write-Host ""
