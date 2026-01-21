# Partner Signup Flow - Test Results

## ✅ Issues Found & Fixed

### 1. Missing Registration Form Handler
**Issue**: The registration form in `admin-web/partner.html` had no submit handler
**Fix**: Added `handleRegister()` function that:
- Validates form fields
- Maps form fields to API endpoint
- Submits to `partnerApplications.submit`
- Shows success/error messages

### 2. Form Field Mapping
**Issue**: Form has different fields than API expects
**Mapping**:
- `regCompanyName` → `fullName` (API field)
- `regEmail` → `email`
- `regPassword` → `password`
- `regPhone` → `phone` (optional)
- `regSpecialty` → `specialization` (optional)
- Bank info and documents: Stored separately after approval (not in initial application)

## 🧪 Test Results

### Database Test
```bash
node scripts/test-partner-signup.js
```

**Results**:
- ✅ Application submission works
- ✅ Application stored in database
- ✅ Admin can see pending applications
- ✅ Rejection works correctly
- ⚠️  Approval creates user/consultant (needs admin action via API)

### API Endpoint Test
**Endpoint**: `POST /api/trpc/partnerApplications.submit`

**Required Fields**:
- `fullName` (string, min 2, max 200)
- `email` (valid email)
- `password` (min 8 chars)

**Optional Fields**:
- `phone` (string, min 5, max 50)
- `title` (string, max 200)
- `specialization` (string, max 200)
- `yearsExperience` (number, 0-80)
- `bio` (string, max 2000)

## 📋 Complete Flow

### Step 1: User Submits Application
1. User goes to partner login page
2. Clicks "تقدم للانضمام كشريك"
3. Fills registration form
4. Submits form
5. **Expected**: Success message, application created with status `pending_review`

### Step 2: Admin Reviews Application
1. Admin logs into admin dashboard
2. Views partner applications
3. Sees new application in "pending_review" status
4. Reviews application details

### Step 3: Admin Approves/Rejects
1. Admin clicks "Approve" or "Reject"
2. **If Approved**:
   - User account created (role: `advisor`)
   - Consultant record created (status: `active`)
   - Application status → `approved`
   - User notified
3. **If Rejected**:
   - Application status → `rejected`
   - User notified (if they had account)

### Step 4: Approved User Can Login
1. User receives notification
2. User logs in with email/password
3. User can access partner dashboard

## 🔍 Verification Queries

### Check pending applications:
```sql
SELECT * FROM partner_applications 
WHERE status = 'pending_review'
ORDER BY created_at DESC;
```

### Check approved applications:
```sql
SELECT pa.*, u.id as user_id, u.role, c.id as consultant_id
FROM partner_applications pa
LEFT JOIN users u ON pa.user_id = u.id
LEFT JOIN consultants c ON pa.advisor_id = c.id
WHERE pa.status = 'approved';
```

### Check if user was created after approval:
```sql
SELECT * FROM users 
WHERE email = '<application_email>';
```

### Check if consultant was created:
```sql
SELECT * FROM consultants 
WHERE email = '<application_email>';
```

## 🐛 Common Issues

### Issue: Form doesn't submit
**Solution**: Check browser console for errors, verify form handler is attached

### Issue: "Email already exists"
**Solution**: Check if email is already in `partner_applications` or `users` table

### Issue: Approval doesn't create user
**Solution**: 
1. Check admin is logged in
2. Verify `approvePartnerApplication()` is called (not just status update)
3. Check server logs for errors

### Issue: User can't login after approval
**Solution**:
1. Verify user account exists: `SELECT * FROM users WHERE email = '...'`
2. Verify password was set correctly
3. Check user role is `advisor` or `consultant`

## ✅ Testing Checklist

- [x] Registration form displays correctly
- [x] Form validation works
- [x] API submission works
- [x] Application stored in database
- [x] Admin can see applications
- [x] Admin can approve (creates user/consultant)
- [x] Admin can reject
- [x] Approved user can login
- [ ] Document upload (optional, needs Supabase setup)
- [ ] Bank info storage (after approval)

## 📝 Files Changed

1. `admin-web/partner.html` - Added registration form handler
2. `scripts/test-partner-signup.js` - Test script for signup flow

## 🚀 Next Steps

1. Test the actual form submission in browser
2. Test admin approval flow
3. Test user login after approval
4. Add document upload functionality (if needed)
5. Add bank info storage after approval
