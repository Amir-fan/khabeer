# 🚀 How to Start the Servers

## Step 1: Open Terminal

Open PowerShell or Command Prompt in the project folder:
```
C:\Users\firas\Downloads\thimmah (3)
```

## Step 2: Start Both Servers

Type this command and press Enter:
```bash
pnpm dev
```

**OR if you don't have pnpm:**
```bash
npm run dev
```

## Step 3: Wait for Startup

You should see output like:
```
[api] server listening on port 3000
Metro bundler ready
```

## Step 4: Open Your Browser

Once you see the servers are ready:
- Go to: `http://localhost:11000`
- You should see your app

## Step 5: Test AI Chat

- Try typing a message to the AI
- It should work now!

---

## If It Doesn't Work

### Check 1: Are you in the right folder?
```bash
cd "C:\Users\firas\Downloads\thimmah (3)"
```

### Check 2: Do you have dependencies installed?
```bash
pnpm install
```

### Check 3: Check for errors
Look at the terminal output - any red error messages?

---

## Quick Commands Reference

```bash
# Start both (backend + frontend)
pnpm dev

# Start backend only
pnpm dev:server

# Start frontend only  
pnpm dev:metro

# Install dependencies
pnpm install
```

---

**That's it! Just run `pnpm dev` and wait for it to start.** 🎯

