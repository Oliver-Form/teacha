#!/bin/bash

# Digital Ocean Deployment Script for Teacha API
# This script sets up the complete Digital Ocean deployment environment

set -e

echo "🚀 Setting up Digital Ocean deployment for Teacha API..."

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ doctl CLI is not installed. Please install it first:"
    echo "   curl -sL https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz | tar -xzv"
    echo "   sudo mv doctl /usr/local/bin"
    exit 1
fi

# Check if user is authenticated
if ! doctl account get &> /dev/null; then
    echo "❌ Please authenticate with Digital Ocean first:"
    echo "   doctl auth init"
    exit 1
fi

echo "✅ doctl is installed and authenticated"

# Variables
REGISTRY_NAME="teacha-registry"
APP_NAME="teacha-api"
DB_NAME="teacha-db"
REGION="nyc3"  # Change this to your preferred region

# Create Container Registry
echo "📦 Creating Container Registry..."
if doctl registry get $REGISTRY_NAME &> /dev/null; then
    echo "✅ Registry $REGISTRY_NAME already exists"
else
    doctl registry create $REGISTRY_NAME --region $REGION
    echo "✅ Created registry: $REGISTRY_NAME"
fi

# Create Managed PostgreSQL Database
echo "🗄️  Creating Managed PostgreSQL Database..."
if doctl databases list | grep -q $DB_NAME; then
    echo "✅ Database $DB_NAME already exists"
    DB_INFO=$(doctl databases get $DB_NAME --format ID,Host,Port,User,Password,DatabaseName --no-header)
else
    echo "Creating PostgreSQL database cluster..."
    doctl databases create $DB_NAME \
        --engine pg \
        --version 15 \
        --size db-s-1vcpu-1gb \
        --region $REGION \
        --num-nodes 1
    
    echo "⏳ Waiting for database to be ready..."
    while ! doctl databases get $DB_NAME | grep -q "online"; do
        echo "   Database is still creating... waiting 30 seconds"
        sleep 30
    done
    
    DB_INFO=$(doctl databases get $DB_NAME --format ID,Host,Port,User,Password,DatabaseName --no-header)
    echo "✅ Created database: $DB_NAME"
fi

# Extract database connection info
DB_ID=$(echo $DB_INFO | awk '{print $1}')
DB_HOST=$(echo $DB_INFO | awk '{print $2}')
DB_PORT=$(echo $DB_INFO | awk '{print $3}')
DB_USER=$(echo $DB_INFO | awk '{print $4}')
DB_PASSWORD=$(echo $DB_INFO | awk '{print $5}')
DB_DATABASE=$(echo $DB_INFO | awk '{print $6}')

DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}?sslmode=require"

echo "📝 Database connection details:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_DATABASE"
echo "   User: $DB_USER"

# Create App Platform specification
echo "🏗️  Creating App Platform specification..."
cat > app-spec.yaml << EOF
name: $APP_NAME
region: $REGION
services:
- name: api
  source_dir: /apps/api
  github:
    repo: $(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/')
    branch: main
    deploy_on_push: true
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 3001
  routes:
  - path: /
  health_check:
    http_path: /health
  envs:
  - key: NODE_ENV
    value: production
  - key: PORT
    value: "3001"
  - key: HOST
    value: "0.0.0.0"
  - key: DATABASE_URL
    value: "$DATABASE_URL"
  - key: JWT_SECRET
    value: "$(openssl rand -base64 32)"
  - key: FRONTEND_URL
    value: "https://your-frontend-domain.com"
EOF

echo "✅ Created app-spec.yaml"

# Create the app
echo "🚀 Creating App Platform application..."
if doctl apps list | grep -q $APP_NAME; then
    echo "✅ App $APP_NAME already exists"
    APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep $APP_NAME | awk '{print $1}')
else
    APP_ID=$(doctl apps create app-spec.yaml --format ID --no-header)
    echo "✅ Created app with ID: $APP_ID"
fi

echo ""
echo "🎉 Deployment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add these secrets to your GitHub repository:"
echo "   - DIGITALOCEAN_ACCESS_TOKEN: (your DO token)"
echo "   - REGISTRY_NAME: $REGISTRY_NAME"
echo "   - APP_ID: $APP_ID"
echo ""
echo "2. Update your .env.production with the actual database URL:"
echo "   DATABASE_URL=\"$DATABASE_URL\""
echo ""
echo "3. Push to main branch to trigger deployment"
echo ""
echo "🔗 Useful commands:"
echo "   View app status: doctl apps get $APP_ID"
echo "   View app logs: doctl apps logs $APP_ID --type run"
echo "   View database: doctl databases get $DB_NAME"
echo ""
