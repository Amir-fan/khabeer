# Vercel Deployment Guide for Khabeer

This guide will help you deploy the Khabeer backend API to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. GitHub repository connected to Vercel
3. All required environment variables configured

## Environment Variables

Set the following environment variables in your Vercel project settings:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Authentication
JWT_SECRET=your-secret-key-here
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://your-oauth-server.com
OWNER_OPEN_ID=your-owner-open-id

# AI Services
GEMINI_API_KEY=your-gemini-api-key
BUILT_IN_FORGE_API_URL=https://forge.manus.im (optional)
BUILT_IN_FORGE_API_KEY=your-forge-api-key (optional)

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis (Optional - for rate limiting)
REDIS_URL=redis://your-redis-url (optional)
```

### Optional Seed Account Variables (Development/Staging Only)

**⚠️ WARNING: Only set these in development/staging environments, NEVER in production!**

```bash
# Seed Admin Account (optional)
SEED_ADMIN_EMAIL=admin@khabeer.com
SEED_ADMIN_PASSWORD=your-secure-password
SEED_ADMIN_NAME=Admin

# Seed Partner Account (optional)
SEED_PARTNER_EMAIL=partner@khabeer.com
SEED_PARTNER_PASSWORD=your-secure-password
SEED_PARTNER_NAME=Partner
```

## Deployment Steps

### 1. Connect Repository to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the repository: `Amir-fan/khabeer`

### 2. Configure Project Settings

- **Framework Preset**: Other
- **Root Directory**: `.` (root)
- **Build Command**: Leave empty (Vercel will auto-detect)
- **Output Directory**: Leave empty
- **Install Command**: `pnpm install`

### 3. Set Environment Variables

1. In Vercel project settings, go to "Environment Variables"
2. Add all required variables listed above
3. Make sure to set them for:
   - Production
   - Preview (optional)
   - Development (optional)

### 4. Deploy

1. Click "Deploy"
2. Vercel will:
   - Install dependencies
   - Build the project
   - Deploy the serverless function

### 5. Verify Deployment

After deployment, test the API:

```bash
# Health check
curl https://your-project.vercel.app/api/health

# Should return: {"ok":true,"timestamp":...}
```

## API Endpoints

Once deployed, your API will be available at:

- **Base URL**: `https://your-project.vercel.app`
- **Health Check**: `https://your-project.vercel.app/api/health`
- **tRPC Endpoint**: `https://your-project.vercel.app/api/trpc`
- **Admin Dashboard**: `https://your-project.vercel.app/admin`
- **OAuth Callback**: `https://your-project.vercel.app/api/oauth/callback`

## Frontend Configuration

Update your frontend to use the Vercel deployment URL:

1. Update `constants/oauth.ts` or wherever your API base URL is configured
2. Set `EXPO_PUBLIC_API_URL=https://your-project.vercel.app` (if using Expo)

## Troubleshooting

### Build Errors

- **Error: Cannot find module**: Make sure all dependencies are in `package.json`
- **Error: TypeScript errors**: Run `pnpm check` locally first
- **Error: Missing environment variables**: Check Vercel environment variables

### Runtime Errors

- **Database connection failed**: Verify `DATABASE_URL` is correct and SSL is enabled
- **JWT errors**: Check `JWT_SECRET` is set
- **CORS errors**: Verify CORS settings in `api/index.ts`

### Function Timeout

- Default timeout is 30 seconds (configured in `vercel.json`)
- For longer operations, consider:
  - Using Vercel Pro plan (60s timeout)
  - Moving heavy operations to background jobs
  - Optimizing database queries

## Security Notes

1. **Never commit `.env` files** - All secrets should be in Vercel environment variables
2. **Seed accounts** - Only enable seed accounts in development/staging
3. **Database** - Use SSL connections (required in Supabase)
4. **JWT Secret** - Use a strong, random secret (at least 32 characters)

## Monitoring

- Check Vercel logs: Dashboard → Your Project → Logs
- Monitor function execution time and errors
- Set up alerts for failed deployments

## Updating Deployment

1. Push changes to your GitHub repository
2. Vercel will automatically:
   - Detect the push
   - Build the new version
   - Deploy to preview
   - Deploy to production (if on main branch)

## Support

For issues:
1. Check Vercel deployment logs
2. Check server logs in Vercel dashboard
3. Verify all environment variables are set correctly
4. Test API endpoints with curl or Postman

