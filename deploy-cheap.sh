#!/bin/bash

# Ultra-Cheap DigitalOcean Deployment Script
# Uses $4/month droplet with SQLite (no managed database)

set -e

echo "🚀 Setting up ultra-cheap deployment on DigitalOcean..."

# Variables
DROPLET_NAME="teacha-api"
REGION="nyc3"
SIZE="s-1vcpu-512mb-10gb"  # $4/month
IMAGE="ubuntu-22-04-x64"

# Create droplet
echo "📦 Creating $4/month droplet..."
DROPLET_ID=$(doctl compute droplet create $DROPLET_NAME \
    --image $IMAGE \
    --size $SIZE \
    --region $REGION \
    --ssh-keys $(doctl compute ssh-key list --format ID --no-header | head -1) \
    --format ID --no-header)

echo "⏳ Waiting for droplet to be ready..."
doctl compute droplet wait $DROPLET_ID

# Get droplet IP
DROPLET_IP=$(doctl compute droplet get $DROPLET_ID --format PublicIPv4 --no-header)
echo "✅ Droplet created with IP: $DROPLET_IP"

# Create deployment script
cat > deploy-commands.sh << 'EOF'
#!/bin/bash
# Commands to run on the droplet

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install git
sudo apt install -y git

# Clone repository
git clone https://github.com/Oliver-Form/teacha.git
cd teacha/apps/api

# Install dependencies
npm install

# Set up environment (using SQLite - no external database needed!)
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATABASE_URL="file:./prod.db"
JWT_SECRET="your-super-secure-jwt-secret-change-this"
FRONTEND_URL="*"
ENVEOF

# Generate Prisma client
npx prisma generate

# Run migrations to create SQLite database
npx prisma migrate deploy

# Seed database
npx prisma db seed

# Build application
npm run build

# Start with PM2
pm2 start dist/src/server.js --name teacha-api
pm2 startup
pm2 save

# Install nginx as reverse proxy
sudo apt install -y nginx

# Configure nginx
sudo tee /etc/nginx/sites-available/teacha-api << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/teacha-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "🎉 Deployment complete!"
echo "Your API is available at: http://$DROPLET_IP"
echo "Test with: curl http://$DROPLET_IP/health"
EOF

echo ""
echo "📋 Next steps:"
echo "1. Copy the deployment script to your droplet:"
echo "   scp deploy-commands.sh root@$DROPLET_IP:~/"
echo ""
echo "2. SSH into your droplet and run the script:"
echo "   ssh root@$DROPLET_IP"
echo "   chmod +x deploy-commands.sh"
echo "   ./deploy-commands.sh"
echo ""
echo "3. Your API will be available at: http://$DROPLET_IP"
echo ""
echo "💰 Total cost: $4/month"
echo "🗄️ Database: SQLite (included, no extra cost)"
echo "🔒 To add SSL: Use Cloudflare (free) or Let's Encrypt"
