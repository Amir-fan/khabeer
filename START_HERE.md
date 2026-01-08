# 🚀 How to Start Backend and Frontend

## 📋 Prerequisites

1. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory with:
   ```env
   DATABASE_URL=your_postgres_connection_string
   JWT_SECRET=your_jwt_secret
   GEMINI_API_KEY=your_gemini_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_key
   ```

3. **Run database migration:**
   ```bash
   # Run the hardening patch SQL
   psql -d your_database_name -f server/drizzle/hardeningPatch.sql
   ```

---

## 🎯 Quick Start (All-in-One)

**Start both backend and frontend together:**
```bash
pnpm dev
```

This will start:
- **Backend:** `http://localhost:3000`
- **Frontend (Expo):** `http://localhost:11000`

---

## 🔧 Start Separately

### Backend Only
```bash
pnpm dev:server
# or
npm run dev:server
```
- Runs on: `http://localhost:3000`
- Serves: API endpoints, admin web pages

### Frontend Only (Expo/Mobile App)
```bash
pnpm dev:metro
# or
npm run dev:metro
```
- Runs on: `http://localhost:11000`
- Opens Expo DevTools

---

## 🌐 Access Points

### Main Website (Mobile App - Web)
- **URL:** `http://localhost:11000`
- **What it is:** React Native app running in web browser
- **Features:** AI chat, consultations, library, etc.

### Admin Dashboard
- **URL:** `http://localhost:3000/admin/index.html`
- **Login:** Use admin credentials
- **Features:** User management, partner applications, settings, withdrawals

### Partner Dashboard
- **URL:** `http://localhost:3000/admin/partner.html`
- **Login:** Use partner/advisor credentials
- **Features:** Consultation management, earnings, withdrawals

### Partner Signup
- **URL:** `http://localhost:3000/admin/partner-signup.html`
- **What it is:** Public signup form for advisors

### API Endpoints
- **tRPC API:** `http://localhost:3000/api/trpc`
- **Health Check:** `http://localhost:3000/api/trpc/system.health`

---

## 📱 Mobile App (Expo)

If you want to test on a physical device:

1. **Install Expo Go** on your phone (iOS/Android)

2. **Start the dev server:**
   ```bash
   pnpm dev:metro
   ```

3. **Scan QR code** that appears in terminal

4. **Or use tunnel:**
   ```bash
   npx expo start --tunnel
   ```

---

## 🐛 Troubleshooting

### Port Already in Use
If port 3000 is busy:
```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or change port in package.json
```

### Database Connection Error
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Run migrations: `pnpm db:push`

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

---

## ✅ Verify Everything Works

1. **Backend Health:**
   ```bash
   curl http://localhost:3000/api/trpc/system.health
   ```

2. **Admin Login:**
   - Go to `http://localhost:3000/admin/index.html`
   - Should see login screen

3. **Frontend:**
   - Go to `http://localhost:11000`
   - Should see Expo app loading

---

## 🎯 Development Workflow

1. **Start both:**
   ```bash
   pnpm dev
   ```

2. **Backend changes:** Auto-reloads (tsx watch)

3. **Frontend changes:** Hot reloads in browser

4. **Check logs:** Both outputs in same terminal

---

**Ready to test!** 🚀

