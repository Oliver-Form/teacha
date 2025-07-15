#!/bin/bash

# Deploy to Railway (FREE tier)
# 500 hours/month - perfect for demos and development

set -e

echo "🚂 Deploying to Railway (FREE tier)..."

# Install Railway CLI if not installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "🔐 Please login to Railway..."
railway login

# Create new project
echo "🆕 Creating new Railway project..."
railway new

# Add PostgreSQL database
echo "🗄️ Adding PostgreSQL database..."
railway add --database postgresql

# Set environment variables
echo "⚙️ Setting environment variables..."
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set HOST=0.0.0.0
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set FRONTEND_URL="*"

# Railway will automatically set DATABASE_URL

# Deploy
echo "🚀 Deploying to Railway..."
railway deploy

echo ""
echo "🎉 Deployment to Railway complete!"
echo ""
echo "💰 Cost: FREE (500 hours/month)"
echo "🗄️ Database: PostgreSQL included"
echo "📱 Your app will be available at: https://your-app-name.up.railway.app"
echo ""
echo "🔍 To check status:"
echo "   railway status"
echo "   railway logs"
echo ""
echo "💡 For production, upgrade to $5/month for unlimited hours"
