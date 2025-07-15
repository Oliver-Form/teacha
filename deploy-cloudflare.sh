#!/bin/bash

# Cloudflare Workers Global Deployment Script
# Cost: $10/month for GLOBAL deployment with D1 database

set -e

echo "⚡ Setting up Cloudflare Workers global deployment..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "📦 Installing Wrangler CLI..."
    npm install -g wrangler
fi

echo "🔐 Authenticating with Cloudflare..."
wrangler login

echo "🗄️  Creating D1 database..."
wrangler d1 create teacha-db

echo "📝 Setting up Worker project..."
cd apps/api

# Create wrangler.toml configuration
cat > wrangler.toml << EOF
name = "teacha-api"
main = "dist/worker.js"
compatibility_date = "2024-07-14"

[vars]
NODE_ENV = "production"
JWT_SECRET = "$(openssl rand -base64 32)"

[[d1_databases]]
binding = "DB"
database_name = "teacha-db"
database_id = "YOUR_DATABASE_ID"  # Replace with actual ID from D1 create

[build]
command = "npm run build:worker"
EOF

# Create Worker entry point
cat > src/worker.ts << 'EOF'
import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from '@prisma/client';
import { AutoRouter } from 'itty-router';
import authRoutes from './routes/auth';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

const router = AutoRouter();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
router.options('*', () => new Response(null, { headers: corsHeaders }));

// Mount auth routes
router.all('/auth/*', authRoutes);

// Health check
router.get('/health', () => 
  Response.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    edge: true 
  })
);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Initialize Prisma with D1 adapter
    const adapter = new PrismaD1(env.DB);
    const prisma = new PrismaClient({ adapter });

    // Add prisma to request context
    (request as any).prisma = prisma;
    (request as any).env = env;

    const response = await router.fetch(request);
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  },
};
EOF

# Update package.json with Worker build script
npm pkg set scripts.build:worker="tsc && wrangler d1 migrations apply --local && wrangler deploy"

echo "📊 Creating database schema..."
# Convert Prisma schema to D1 migrations
wrangler d1 execute teacha-db --file=prisma/migrations/*/migration.sql

echo "🚀 Deploying to Cloudflare Edge..."
npm run build:worker

echo "✅ Deployment complete!"
echo ""
echo "🌍 Your API is now deployed to 200+ edge locations worldwide!"
echo "💰 Cost: $10/month for global deployment"
echo "⚡ 0ms cold start, always warm"
echo ""
echo "📝 To update:"
echo "   npm run build:worker"
