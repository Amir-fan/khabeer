# 🔍 Check Backend Logs for Real Error

## The Issue

Your `.env` file HAS `GEMINI_API_KEY` set, but the AI is still failing.

The error message you see is a **generic catch-all** - the real error is being logged in the backend terminal.

## What to Do

### 1. Look at Backend Terminal

In the terminal where you ran `pnpm dev:server`, look for error messages like:

```
[ERROR] AI Chat Error
[ERROR] Gemini API error
[ERROR] Gemini API invocation failed
```

### 2. Common Errors:

**Invalid API Key:**
```
Gemini API error: { status: 401, error: "API key not valid" }
```

**Quota Exceeded:**
```
Gemini API error: { status: 429, error: "Quota exceeded" }
```

**Network Error:**
```
Gemini API invocation failed: fetch failed
```

### 3. Share the Error

Copy the **exact error message** from the backend terminal and share it.

---

## Quick Test

Try this in your browser console (F12) while on http://localhost:11000:

```javascript
fetch('http://localhost:3000/api/trpc/ai.chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify([{id: 1, json: {message: "test"}}])
}).then(r => r.json()).then(console.log).catch(console.error)
```

This will show the actual error response.

