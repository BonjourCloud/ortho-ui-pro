#!/bin/bash

# Pre-Deployment Checklist Script
# Run this before deploying to Vercel to catch common issues

echo "🔍 Pre-Deployment Checklist for Ortho UI Pro"
echo "=============================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
echo "1. Checking .env file..."
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    # Check if it contains the placeholder values
    if grep -q "your-project-ref-here" .env; then
        echo -e "${RED}✗${NC} .env still contains placeholder values!"
        echo "   Update .env with your actual Supabase credentials"
    else
        echo -e "${GREEN}✓${NC} .env appears to be configured"
    fi
else
    echo -e "${RED}✗${NC} .env file not found!"
    echo "   Copy .env.example to .env and add your credentials"
fi
echo ""

# Check if node_modules exists
echo "2. Checking dependencies..."
if [ -d node_modules ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${YELLOW}!${NC} node_modules not found. Run: npm install"
fi
echo ""

# Check if build works
echo "3. Testing build..."
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Build successful"
    
    # Check if dist folder was created
    if [ -d dist ]; then
        echo -e "${GREEN}✓${NC} dist folder created"
    fi
else
    echo -e "${RED}✗${NC} Build failed! Check errors above"
fi
echo ""

# Check vercel.json
echo "4. Checking Vercel configuration..."
if [ -f vercel.json ]; then
    echo -e "${GREEN}✓${NC} vercel.json exists"
else
    echo -e "${RED}✗${NC} vercel.json not found!"
fi
echo ""

# Check if Supabase CLI is installed
echo "5. Checking Supabase CLI..."
if command -v supabase &> /dev/null; then
    echo -e "${GREEN}✓${NC} Supabase CLI installed"
    supabase --version
else
    echo -e "${YELLOW}!${NC} Supabase CLI not installed"
    echo "   Install with: npm install -g supabase"
fi
echo ""

# Check if migrations exist
echo "6. Checking database migrations..."
if [ -d supabase/migrations ]; then
    MIGRATION_COUNT=$(ls -1 supabase/migrations/*.sql 2>/dev/null | wc -l)
    echo -e "${GREEN}✓${NC} Found $MIGRATION_COUNT migration files"
else
    echo -e "${RED}✗${NC} supabase/migrations folder not found!"
fi
echo ""

# Check if edge functions exist
echo "7. Checking edge functions..."
if [ -d supabase/functions/assign-admin-role ]; then
    echo -e "${GREEN}✓${NC} assign-admin-role function exists"
else
    echo -e "${RED}✗${NC} Edge function not found!"
fi
echo ""

echo "=============================================="
echo "Pre-deployment check complete!"
echo ""
echo "Next steps:"
echo "1. Fix any issues marked with ✗ or !"
echo "2. Follow MIGRATION_CHECKLIST.md for full deployment"
echo "3. Push to GitHub and connect to Vercel"
echo ""
