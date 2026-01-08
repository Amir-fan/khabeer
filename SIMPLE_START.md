# 🚀 How to Start Backend and Frontend

## Option 1: Start Both Together

```bash
pnpm dev
```

Starts both backend and frontend at once.

---

## Option 2: Start Separately (2 Commands)

**Terminal 1 - Backend:**
```bash
pnpm dev:server
```
Backend runs on `http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
pnpm dev:metro
```
Frontend runs on `http://localhost:11000`

---

## What You'll See

**Backend ready:**
- `[api] server listening on port 3000` ✅

**Frontend ready:**
- `Metro bundler ready` ✅
- Then open: **http://localhost:11000**

---

## If You Get Errors

1. **First time?** Run: `pnpm install`
2. **Port busy?** Close other programs using ports 3000 or 11000
3. **Still broken?** Share the error message

