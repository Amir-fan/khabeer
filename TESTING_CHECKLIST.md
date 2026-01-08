# 🧪 Testing Checklist

## ⚠️ BEFORE TESTING - Run Database Migration

**CRITICAL:** You must run the database migration first:

```bash
# Option 1: Using psql
psql -d your_database_name -f server/drizzle/hardeningPatch.sql

# Option 2: Using drizzle-kit (if configured)
npm run db:migrate
```

This creates:
- `withdrawal_requests` table
- `password_reset_tokens` table
- Adds payment gateway fields to `orders` table

---

## ✅ Ready to Test

### 1. **Payment Flow**
- ✅ Payment placeholder creates pending order
- ✅ Chat is BLOCKED until payment completed
- ✅ `startSession` enforces payment completion

**Test:**
1. Create consultation request
2. Try to reserve payment → Should create pending order
3. Try to start session → Should be BLOCKED (payment not completed)
4. Verify order status is "pending" (not "completed")

### 2. **Withdrawal System**
- ✅ Advisor can request withdrawal
- ✅ Balance calculated from ledger only
- ✅ Admin can approve/reject
- ✅ No fake money

**Test:**
1. Login as advisor/partner
2. Check balance → Should show real balance from released consultations
3. Request withdrawal → Should create pending request
4. Login as admin → Approve withdrawal → Should show "approved" (not "completed")
5. Verify balance deducted from available balance

### 3. **Admin Settings**
- ✅ Settings persist to backend
- ✅ No localStorage fallback
- ✅ Settings load on dashboard init

**Test:**
1. Login as admin
2. Change pricing/complexity/blur settings
3. Refresh page → Settings should persist
4. Check `system_settings` table → Should see saved values

### 4. **Password Reset**
- ✅ Request reset → Generates secure token
- ✅ Reset password → Validates token, updates password
- ✅ Token expires after 30 minutes
- ✅ Token invalidated after use

**Test:**
1. Request password reset for existing user
2. Check `password_reset_tokens` table → Should see hashed token
3. Use token to reset password → Should work
4. Try to use same token again → Should fail (already used)

### 5. **Fallback Auth**
- ✅ Production mode → Fallback completely disabled
- ✅ Dev mode → Fallback only if env vars set

**Test:**
1. Set `NODE_ENV=production`
2. Try fallback login → Should fail (goes to DB lookup)
3. Set `NODE_ENV=development` with env vars
4. Try fallback login → Should work (dev only)

### 6. **Consultation Assignment**
- ✅ Admin can assign advisor
- ✅ Creates real assignment record

**Test:**
1. Create consultation request
2. Login as admin
3. Assign advisor → Should create `request_assignments` record
4. Status should be "pending_advisor"

### 7. **Email Placeholder**
- ✅ Returns honest failure status
- ✅ Logs email attempts

**Test:**
1. Request password reset
2. Check logs → Should see email placeholder called
3. Response should be `{ delivered: false, reason: "EMAIL_NOT_CONFIGURED" }`

---

## 🚨 Known Limitations (Expected)

1. **Payment Gateway:** Placeholder only - payments won't actually process
2. **Email:** Placeholder only - emails won't actually send
3. **Withdrawal Completion:** Placeholder only - money won't actually transfer

These are **intentional placeholders** ready for integration.

---

## ✅ System Status

**All critical hardening complete:**
- ✅ No fake payment success
- ✅ No fake money
- ✅ No fake withdrawals
- ✅ No localStorage business logic
- ✅ No dev backdoors in production
- ✅ Real password reset
- ✅ Real settings persistence

**Ready for testing!** 🚀

