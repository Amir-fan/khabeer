# 🔧 Fix "FAILED TO FETCH" Error

## The Problem
"FAILED TO FETCH" means the frontend can't connect to the backend.

## Quick Fix Steps

### 1. Check if Backend is Running

Open a **NEW terminal** and run:
```bash
pnpm dev:server
```

**Look for this line:**
```
[api] server listening on port 3000
```

✅ **If you see this** → Backend is running!  
❌ **If you see errors** → Share the error message

---

### 2. Test Backend Manually

Open browser and go to:
```
http://localhost:3000/api/health
```

**Should show:** `{"ok":true,"timestamp":...}`

✅ **If it works** → Backend is fine, check frontend URL  
❌ **If it fails** → Backend isn't running or crashed

---

### 3. Common Issues

**Issue: Port 3000 is busy**
```bash
# Windows: Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F
```

**Issue: Backend crashes on startup**
- Check terminal for error messages
- Make sure `.env` file exists
- Check if database is accessible

**Issue: Frontend connects to wrong URL**
- Frontend should use: `http://localhost:3000`
- Check browser console for the exact error

---

### 4. Start Both Servers

**Terminal 1:**
```bash
pnpm dev:server
```

**Terminal 2:**
```bash
pnpm dev:metro
```

**Then open:** http://localhost:11000

---

## Still Not Working?

Share:
1. The exact error message from browser console
2. The terminal output from `pnpm dev:server`
3. What you see at `http://localhost:3000/api/health`

