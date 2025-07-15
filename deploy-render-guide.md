# Render.com Free Deployment Guide

## FREE Deployment Steps:

1. **Go to [render.com](https://render.com)**
2. **Connect your GitHub account**
3. **Create New Web Service**
   - Repository: `Oliver-Form/teacha`
   - Root Directory: `apps/api`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npx prisma migrate deploy && npm start`

4. **Add Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3001
   HOST=0.0.0.0
   JWT_SECRET=your-super-secure-jwt-secret-32-chars
   DATABASE_URL=(auto-provided by Render PostgreSQL)
   FRONTEND_URL=*
   ```

5. **Add PostgreSQL Database:**
   - Create new PostgreSQL database (free for 90 days)
   - Copy connection string to DATABASE_URL

## Cost Breakdown:
- **Web Service**: FREE (750 hours/month)
- **PostgreSQL**: FREE for 90 days, then $7/month
- **Total**: FREE for 3 months, then $7/month

## Pros:
✅ Zero configuration
✅ Auto-deploys on git push  
✅ Free SSL certificates
✅ Good for development/demos

## Cons:
❌ Spins down after 15 minutes of inactivity (free tier)
❌ Cold start delays
❌ Database costs $7/month after 90 days
