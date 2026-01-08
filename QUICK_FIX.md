# ⚡ QUICK FIX: Failed to Fetch

## Step 1: Stop Everything

**In your terminal, press:** `Ctrl + C` (multiple times if needed)

**Or kill all Node processes:**
```powershell
Get-Process node | Stop-Process -Force
```

---

## Step 2: Start Backend

**Open a NEW terminal window and run:**
```bash
pnpm dev:server
```

**Wait for this line:**
```
[api] server listening on port 3000
```

✅ **If you see this** → Backend is running!

❌ **If you see errors** → Copy the error and share it

---

## Step 3: Test Backend

**Open browser:** http://localhost:3000/api/health

**Should show:** `{"ok":true,"timestamp":1234567890}`

---

## Step 4: Start Frontend

**Open ANOTHER terminal window:**
```bash
pnpm dev:metro
```

**Wait for:** `Metro bundler ready`

**Then open:** http://localhost:11000

---

## ✅ Done!

If backend shows `listening on port 3000` and health check works, the "FAILED TO FETCH" error should be gone.

---

## Still Broken?

1. Check backend terminal for errors
2. Check browser console (F12) for exact error
3. Make sure you're using `http://localhost:11000` (not 3000)

