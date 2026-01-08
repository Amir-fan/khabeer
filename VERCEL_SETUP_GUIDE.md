# Vercel Setup Guide - Step by Step

## Vercel Project Settings

When you import your GitHub repository to Vercel, use these exact settings:

### 1. Framework Preset
```
Other
```
*(Not Next.js, not Express - select "Other" since we're using a custom Express server)*

### 2. Root Directory
```
./
```
*(Leave as default - root of the repository)*

### 3. Build Command
```
Leave EMPTY
```
*(Vercel will auto-detect - we don't need a build step for serverless functions)*

### 4. Output Directory
```
Leave EMPTY
```
*(Not applicable for serverless functions)*

### 5. Install Command
```
pnpm install
```
*(Since you're using pnpm as package manager)*

### 6. Development Command
```
Leave EMPTY or: pnpm dev
```
*(Optional - only if you want to test locally with Vercel CLI)*

---

## Environment Variables

Add these in Vercel Dashboard → Your Project → Settings → Environment Variables

### 🔴 REQUIRED (Production)

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Authentication & Security
JWT_SECRET=your-very-long-random-secret-key-minimum-32-characters
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://your-oauth-server-url.com
OWNER_OPEN_ID=your-owner-open-id-from-manus

# AI Services
GEMINI_API_KEY=your-google-gemini-api-key

# Supabase (Storage & Database)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Node Environment
NODE_ENV=production
```

### 🟡 OPTIONAL (Recommended)

```bash
# Forge API (Fallback for AI)
BUILT_IN_FORGE_API_URL=https://forge.manus.im
BUILT_IN_FORGE_API_KEY=your-forge-api-key

# Redis (For Rate Limiting - Optional)
REDIS_URL=redis://your-redis-url:6379

# Sentry (Error Monitoring - Optional)
SENTRY_DSN=your-sentry-dsn-url
```

### 🟢 DEVELOPMENT ONLY (Never in Production!)

```bash
# Seed Accounts (ONLY for development/staging)
SEED_ADMIN_EMAIL=admin@khabeer.com
SEED_ADMIN_PASSWORD=your-secure-password-here
SEED_ADMIN_NAME=Admin

SEED_PARTNER_EMAIL=partner@khabeer.com
SEED_PARTNER_PASSWORD=your-secure-password-here
SEED_PARTNER_NAME=Partner
```

**⚠️ WARNING**: 
- **NEVER** set seed account variables in Production environment
- Only set them in Preview/Development if you need test accounts
- These create default admin/partner accounts on server startup

---

## Environment Variable Setup in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. For each variable:
   - Click **Add New**
   - Enter the **Name** (e.g., `DATABASE_URL`)
   - Enter the **Value** (your actual value)
   - Select which environments to apply to:
     - ✅ **Production** (for required vars)
     - ✅ **Preview** (optional - for branch deployments)
     - ✅ **Development** (optional - for local dev with Vercel CLI)
   - Click **Save**

### Recommended Environment Selection:

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `DATABASE_URL` | ✅ | ✅ | ✅ |
| `JWT_SECRET` | ✅ | ✅ | ✅ |
| `GEMINI_API_KEY` | ✅ | ✅ | ✅ |
| `SUPABASE_URL` | ✅ | ✅ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ✅ |
| `SEED_ADMIN_EMAIL` | ❌ | ✅ | ✅ |
| `SEED_ADMIN_PASSWORD` | ❌ | ✅ | ✅ |
| `SEED_PARTNER_EMAIL` | ❌ | ✅ | ✅ |
| `SEED_PARTNER_PASSWORD` | ❌ | ✅ | ✅ |

---

## Quick Setup Checklist

- [ ] Import repository to Vercel
- [ ] Set Framework Preset to **"Other"**
- [ ] Set Install Command to **"pnpm install"**
- [ ] Leave Build Command **EMPTY**
- [ ] Leave Output Directory **EMPTY**
- [ ] Add all **REQUIRED** environment variables
- [ ] Add **OPTIONAL** environment variables (if needed)
- [ ] **DO NOT** add seed account variables to Production
- [ ] Click **Deploy**

---

## After Deployment

Once deployed, your API will be available at:
- `https://your-project-name.vercel.app/api/health`
- `https://your-project-name.vercel.app/api/trpc`
- `https://your-project-name.vercel.app/admin`

Test the deployment:
```bash
curl https://your-project-name.vercel.app/api/health
```

Should return: `{"ok":true,"timestamp":...}`

---

## Troubleshooting

### Build Fails
- Check that `pnpm` is selected as package manager
- Verify all required environment variables are set
- Check Vercel build logs for specific errors

### Runtime Errors
- Verify `DATABASE_URL` is correct and SSL is enabled
- Check `JWT_SECRET` is set and long enough (32+ chars)
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct

### Function Timeout
- Default timeout is 30 seconds (configured in `vercel.json`)
- For longer operations, consider Vercel Pro plan (60s timeout)

---

## Example Environment Variables (Format Only - Use Your Real Values)

```bash
# Example format - replace with your actual values
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=super-secret-key-minimum-32-characters-long-for-security
VITE_APP_ID=your-manus-app-id-here
OAUTH_SERVER_URL=https://oauth.manus.im
OWNER_OPEN_ID=your-open-id-here
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_ENV=production
```

---

## Security Best Practices

1. ✅ **Never commit `.env` files** - All secrets in Vercel
2. ✅ **Use strong JWT_SECRET** - At least 32 random characters
3. ✅ **Enable SSL for database** - Always use `?sslmode=require`
4. ✅ **Rotate secrets regularly** - Especially if exposed
5. ✅ **Use different values** - Production vs Development
6. ❌ **Never set seed accounts in production**

---

## Need Help?

- Check Vercel logs: Dashboard → Your Project → Logs
- Check deployment logs: Dashboard → Your Project → Deployments → Click deployment
- Verify environment variables are set correctly
- Test API endpoints with curl or Postman

