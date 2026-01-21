# Testing Checklist - Consultation Flow

## ✅ Completed Fixes

### 1. Fixed Consultant Request Modal
- **Issue**: Modal showed fake success message without collecting info
- **Fix**: Changed to navigate to `/consultant-request` form
- **Status**: ✅ Fixed
- **Test**: Click "طلب مستشار" → Select option → Should navigate to form

### 2. Automatic Assignment
- **Issue**: Requests weren't automatically assigned to advisors
- **Fix**: Added `assignAdvisorToConsultation()` call in `createConsultationRecord()`
- **Status**: ✅ Fixed
- **Test**: Create request → Check `request_assignments` table → Should have `offered` assignment

### 3. Error Handling
- **Issue**: "Failed to fetch" errors not showing details
- **Fix**: Added console logging and better error messages in `partner.html`
- **Status**: ✅ Fixed
- **Test**: Try accept/reject → Check browser console for detailed errors

### 4. Database Cleanup
- **Issue**: Old test data cluttering database
- **Fix**: Created `scripts/clean-all-orders.js`
- **Status**: ✅ Fixed
- **Test**: Run script → All consultation data cleaned

## 🧪 Testing Steps

### Test 1: User Creates Request
1. Open app
2. Click "طلب مستشار" button
3. Select a category (e.g., "استثمارات وأسهم")
4. **Expected**: Navigate to `/consultant-request` form
5. Select service type (e.g., "مراجعة عقد")
6. Enter description
7. Optionally attach file
8. Click "إرسال الطلب"
9. **Expected**: 
   - Success alert shown
   - Request created in database
   - Status = `pending_advisor`
   - Assignment created with status = `offered`

**Verification**:
```sql
SELECT r.*, a.status as assignment_status
FROM consultation_requests r
LEFT JOIN request_assignments a ON r.id = a.request_id
WHERE r.user_id = <user_id>
ORDER BY r.created_at DESC
LIMIT 1;
```

### Test 2: Advisor Sees Request
1. Open partner dashboard: `http://localhost:3000/admin/partner.html`
2. Login as `partner@khabeer.com` / `partner123`
3. Check "New Orders" section
4. **Expected**: 
   - See pending request(s)
   - Show request summary
   - Show Accept/Reject buttons

**Verification**:
- Check browser console for API calls
- Verify `partner.dashboard` query returns data

### Test 3: Advisor Accepts Request
1. In partner dashboard, click "قبول" (Accept)
2. **Expected**:
   - Success message: "تم قبول الطلب بنجاح"
   - Request moves from "New Orders" to "Active Orders"
   - Request status = `accepted`
   - Assignment status = `accepted`
   - `advisor_id` set on request

**Verification**:
```sql
SELECT r.status, r.advisor_id, a.status as assignment_status
FROM consultation_requests r
JOIN request_assignments a ON r.id = a.request_id
WHERE r.id = <request_id>;
```

### Test 4: Advisor Rejects Request
1. Create new request (or use existing pending)
2. In partner dashboard, click "رفض" (Reject)
3. **Expected**:
   - Success message: "تم رفض الطلب"
   - Request removed from "New Orders"
   - Assignment status = `declined`
   - Request status remains `pending_advisor` (can be assigned to another advisor)

**Verification**:
```sql
SELECT r.status, a.status as assignment_status
FROM consultation_requests r
JOIN request_assignments a ON r.id = a.request_id
WHERE a.id = <assignment_id>;
```

### Test 5: Full End-to-End Flow
1. User creates request → ✅
2. Request automatically assigned → ✅
3. Advisor sees request → ✅
4. Advisor accepts → ✅
5. User reserves payment → ⏳ (Next step)
6. Payment completed → ⏳ (Next step)
7. User starts session → ⏳ (Next step)
8. Messages exchanged → ⏳ (Next step)
9. Session completed → ⏳ (Next step)
10. Payment released → ⏳ (Next step)

## 🔍 Debugging

### If advisor doesn't see requests:
1. Check if assignment exists:
   ```sql
   SELECT * FROM request_assignments WHERE advisor_id = <advisor_id>;
   ```
2. Check request status:
   ```sql
   SELECT * FROM consultation_requests WHERE status = 'pending_advisor';
   ```
3. Check advisor is active:
   ```sql
   SELECT * FROM consultants WHERE id = <advisor_id> AND status = 'active';
   ```

### If accept/reject fails:
1. Open browser console (F12)
2. Check for error messages
3. Verify token in localStorage: `localStorage.getItem('partner_token')`
4. Check network tab for API request/response
5. Verify assignment belongs to advisor:
   ```sql
   SELECT * FROM request_assignments WHERE id = <assignment_id> AND advisor_id = <advisor_id>;
   ```

### If request not assigned automatically:
1. Check if advisors exist:
   ```sql
   SELECT * FROM consultants WHERE status = 'active';
   ```
2. Check server logs for errors
3. Verify `assignAdvisorToConsultation()` is called in `createConsultationRecord()`

## 📝 Test Scripts

Run these scripts to verify functionality:

1. **Clean all orders**: `node scripts/clean-all-orders.js`
2. **Test full journey**: `node scripts/test-full-journey.js`
3. **Test API endpoints**: `node scripts/test-api-endpoints.js`
4. **Test accept/reject**: `node scripts/test-accept-reject.js`

## ✅ Current Status

- [x] User can create request
- [x] Request automatically assigned
- [x] Advisor sees request in dashboard
- [x] Advisor can accept request
- [x] Advisor can reject request
- [x] Status transitions work correctly
- [ ] Payment flow (next step)
- [ ] Session management (next step)
- [ ] Message exchange (next step)
- [ ] Payment release (next step)

## 🚀 Next Steps

1. Test payment reservation flow
2. Test payment completion
3. Test session start
4. Test message exchange
5. Test session completion
6. Test payment release
