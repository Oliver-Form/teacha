# Digital Ocean Deployment Guide

This guide will help you deploy the Teacha API to Digital Ocean using App Platform and managed PostgreSQL.

## Prerequisites

1. **Digital Ocean Account**: Sign up at [digitalocean.com](https://digitalocean.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **doctl CLI**: Digital Ocean command-line tool

## Step 1: Install and Configure doctl

```bash
# Download and install doctl (Linux)
curl -sL https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz | tar -xzv
sudo mv doctl /usr/local/bin

# Authenticate with Digital Ocean
doctl auth init
```

Follow the prompts to enter your Digital Ocean API token.

## Step 2: Run the Deployment Script

Make the deployment script executable and run it:

```bash
chmod +x deploy-to-do.sh
./deploy-to-do.sh
```

This script will:
- Create a Container Registry
- Set up a managed PostgreSQL database
- Create an App Platform application
- Generate connection strings and configuration

## Step 3: Configure GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

1. **DIGITALOCEAN_ACCESS_TOKEN**: Your Digital Ocean API token
2. **REGISTRY_NAME**: `teacha-registry` (from script output)
3. **APP_ID**: App Platform ID (from script output)

## Step 4: Update Environment Variables

Update your production environment file with the actual database URL:

```bash
# In apps/api/.env.production
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
JWT_SECRET="your-super-secure-jwt-secret-minimum-32-characters-long"
FRONTEND_URL="https://your-frontend-domain.com"
```

## Step 5: Deploy

Push your code to the main branch to trigger the deployment:

```bash
git add .
git commit -m "Deploy to Digital Ocean"
git push origin main
```

## Step 6: Verify Deployment

1. **Check deployment status**:
   ```bash
   doctl apps get YOUR_APP_ID
   ```

2. **View logs**:
   ```bash
   doctl apps logs YOUR_APP_ID --type run
   ```

3. **Test the API**:
   ```bash
   curl https://your-app-url/health
   curl https://your-app-url/ping
   ```

## Manual Deployment Alternative

If you prefer to deploy manually through the Digital Ocean web interface:

1. Go to [Digital Ocean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. Select the `apps/api` directory as the source
5. Use the provided `app-spec.yaml` configuration
6. Configure environment variables in the web interface

## Database Migration

The app will automatically run migrations on startup. If you need to run them manually:

```bash
# Connect to your app's console
doctl apps logs YOUR_APP_ID --type run --follow

# Or run migrations locally against production DB
cd apps/api
DATABASE_URL="your-production-db-url" npx prisma migrate deploy
```

## Production Checklist

- [ ] Database is created and accessible
- [ ] Environment variables are set correctly
- [ ] SSL/TLS is configured
- [ ] Health checks are passing
- [ ] JWT secret is secure (32+ characters)
- [ ] CORS is configured for your frontend domain
- [ ] Database migrations are applied
- [ ] Monitoring and logging are set up

## Troubleshooting

### Common Issues

1. **Build fails**: Check that all dependencies are in `package.json`
2. **Database connection fails**: Verify `DATABASE_URL` format and credentials
3. **Health check fails**: Check logs for specific error messages
4. **App won't start**: Ensure `PORT` and `HOST` environment variables are set correctly

### Useful Commands

```bash
# View app details
doctl apps get YOUR_APP_ID

# View deployment history
doctl apps list-deployments YOUR_APP_ID

# View build logs
doctl apps logs YOUR_APP_ID --type build

# View runtime logs
doctl apps logs YOUR_APP_ID --type run

# Restart app
doctl apps create-deployment YOUR_APP_ID

# View database info
doctl databases get teacha-db

# View registry info
doctl registry get teacha-registry
```

## Cost Optimization

- **Basic plan**: ~$5/month for small apps
- **Database**: ~$15/month for basic managed PostgreSQL
- **Container Registry**: Free tier available

## Security Considerations

1. Use strong JWT secrets (32+ characters)
2. Enable SSL/TLS (automatic with App Platform)
3. Restrict database access to your app
4. Use environment variables for all secrets
5. Enable database connection pooling
6. Consider adding rate limiting
7. Monitor for security vulnerabilities

## Next Steps

1. Set up monitoring and alerting
2. Configure custom domain
3. Add SSL certificate
4. Set up backup strategy
5. Implement logging aggregation
6. Add performance monitoring
7. Set up staging environment

## Support

- [Digital Ocean Documentation](https://docs.digitalocean.com/)
- [App Platform Docs](https://docs.digitalocean.com/products/app-platform/)
- [Managed Databases](https://docs.digitalocean.com/products/databases/)
