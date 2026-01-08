# 🚀 START COMMANDS

## Two Commands to Run Everything

### Terminal 1 - Backend:
```bash
pnpm dev:server
```

### Terminal 2 - Frontend:
```bash
pnpm dev:metro
```

---

## What They Do

**Backend (`pnpm dev:server`):**
- Starts Express server on port 3000
- Serves API at: `http://localhost:3000/api/trpc`
- Health check: `http://localhost:3000/api/health`
- Admin pages: `http://localhost:3000/admin/index.html`

**Frontend (`pnpm dev:metro`):**
- Starts Expo dev server on port 11000
- Opens: `http://localhost:11000`
- Hot reload enabled

---

## First Time Setup

If you haven't installed dependencies:
```bash
pnpm install
```

---

## Verify It's Working

1. **Backend running?** Open: http://localhost:3000/api/health
   - Should show: `{"ok":true,"timestamp":...}`

2. **Frontend running?** Open: http://localhost:11000
   - Should show the app

---

## Troubleshooting

**Backend won't start?**
- Check terminal for errors
- Make sure port 3000 is free: `netstat -ano | findstr :3000`

**Frontend shows "Failed to fetch"?**
- Make sure backend is running first
- Check browser console (F12) for exact error

