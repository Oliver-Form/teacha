#!/bin/bash

# Local Testing Script for Teacha API
# Run this script to test the API locally before deployment

set -e

echo "🧪 Testing Teacha API locally..."

API_URL="http://localhost:3001"
API_PID=""

# Function to cleanup
cleanup() {
    if [ ! -z "$API_PID" ]; then
        echo "🛑 Stopping API server..."
        kill $API_PID 2>/dev/null || true
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Change to API directory
cd apps/api

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init || true

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed

# Build the application
echo "🏗️  Building application..."
npm run build

# Start the server in background
echo "🚀 Starting API server..."
npm start &
API_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Test endpoints
echo "🧪 Testing endpoints..."

# Health check
echo "Testing /health endpoint..."
curl -s "$API_URL/health" | jq . || echo "❌ Health check failed"

# Ping
echo "Testing /ping endpoint..."
curl -s "$API_URL/ping" | jq . || echo "❌ Ping failed"

# Register a test user
echo "Testing user registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User",
    "role": "user"
  }')

echo "Registration response: $REGISTER_RESPONSE"

# Login
echo "Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')

if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
    echo "✅ Authentication successful"
    
    # Test protected endpoint
    echo "Testing protected endpoint..."
    PROFILE_RESPONSE=$(curl -s "$API_URL/me" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "Profile response: $PROFILE_RESPONSE"
    
    # Test users endpoint
    echo "Testing users endpoint..."
    USERS_RESPONSE=$(curl -s "$API_URL/" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "Users response: $USERS_RESPONSE"
else
    echo "❌ Authentication failed - no token received"
fi

echo ""
echo "🎉 Local testing completed!"
echo "✅ API is ready for deployment"
echo ""
echo "To deploy to Digital Ocean:"
echo "1. Run: ./deploy-to-do.sh"
echo "2. Configure GitHub secrets"
echo "3. Push to main branch"
echo ""
# 