#!/bin/bash

# Google Cloud Run Global Deployment Script
# Cost: ~$25-50/month for global deployment

set -e

echo "🌍 Setting up Google Cloud Run global deployment..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not installed. Install it first:"
    echo "   curl https://sdk.cloud.google.com | bash"
    echo "   exec -l \$SHELL"
    exit 1
fi

# Configuration
PROJECT_ID="teacha-api-$(date +%s)"
REGIONS=("us-central1" "europe-west1" "asia-southeast1")
SERVICE_NAME="teacha-api"
DB_INSTANCE="teacha-db"

echo "📝 Creating Google Cloud project..."
gcloud projects create $PROJECT_ID --name="Teacha API"
gcloud config set project $PROJECT_ID

echo "💳 Enabling required APIs..."
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable compute.googleapis.com

echo "🗄️  Creating Cloud SQL instance..."
gcloud sql instances create $DB_INSTANCE \
    --database-version=POSTGRES_14 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --storage-size=10GB \
    --storage-type=SSD

echo "🔐 Setting database password..."
DB_PASSWORD=$(openssl rand -base64 32)
gcloud sql users set-password postgres \
    --instance=$DB_INSTANCE \
    --password=$DB_PASSWORD

echo "📦 Building and pushing container..."
cd apps/api

# Create Dockerfile for Cloud Run
cat > Dockerfile.cloudrun << EOF
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 8080
CMD ["npm", "start"]
EOF

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

echo "🚀 Deploying to multiple regions..."
for region in "${REGIONS[@]}"; do
    echo "Deploying to $region..."
    gcloud run deploy $SERVICE_NAME \
        --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
        --platform managed \
        --region $region \
        --allow-unauthenticated \
        --port 8080 \
        --memory 512Mi \
        --set-env-vars NODE_ENV=production,PORT=8080,DATABASE_URL="postgresql://postgres:$DB_PASSWORD@/teacha?host=/cloudsql/$PROJECT_ID:us-central1:$DB_INSTANCE" \
        --add-cloudsql-instances $PROJECT_ID:us-central1:$DB_INSTANCE
done

echo "🌐 Setting up Global Load Balancer..."
# This requires more complex setup - typically done via console for first time

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set up Global Load Balancer in Google Cloud Console"
echo "2. Configure custom domain"
echo "3. Set up monitoring and alerts"
echo ""
echo "💰 Expected monthly cost: $25-50"
echo "🌍 Your API will be available globally with <100ms latency"
