# Complete Consultation Flow Documentation

## Overview
This document describes the complete user and advisor journey for consultation requests, from creation to payment and completion.

## Database Schema

### Key Tables
- `consultation_requests`: Main consultation request records
- `request_assignments`: Links requests to advisors (many-to-many)
- `orders`: Payment records linked to requests
- `consultation_messages`: Messages between user and advisor
- `request_transitions`: Audit trail of status changes

### Status Flow
```
submitted → pending_advisor → accepted → awaiting_payment → paid → in_progress → completed → released
```

## User Journey

### Step 1: User Creates Consultation Request
**Endpoint**: `POST /api/trpc/consultations.create`

**User Action**: 
- User selects a service type (e.g., "استشارة شرعية")
- User enters summary/description
- User optionally uploads files
- User submits request

**Backend Process**:
1. `createConsultationRecord()` is called
2. Request created with status `submitted`
3. Status immediately updated to `pending_advisor`
4. **NEW**: Automatically calls `assignAdvisorToConsultation()` to create assignment
5. Assignment created with status `offered` in `request_assignments` table

**Database Changes**:
- New row in `consultation_requests` (status: `pending_advisor`)
- New row in `request_assignments` (status: `offered`)
- New row in `request_transitions` (audit)

### Step 2: Advisor Sees Request
**Endpoint**: `GET /api/trpc/partner.dashboard`

**Advisor Action**: 
- Advisor logs into partner dashboard
- Dashboard shows "New Orders" section

**Backend Process**:
1. Query `request_assignments` where:
   - `advisor_id` = current advisor
   - `status` = `'offered'`
   - `request.status` = `'pending_advisor'`
2. Return list of pending requests

**What Advisor Sees**:
- Request summary
- Request ID
- Assignment ID
- Accept/Reject buttons

### Step 3: Advisor Accepts/Rejects
**Endpoint**: `POST /api/trpc/consultations.advisorRespond`

**Advisor Action**: 
- Clicks "قبول" (Accept) or "رفض" (Reject)

**Backend Process (Accept)**:
1. Verify assignment belongs to advisor
2. Verify request status is `pending_advisor`
3. Update `request_assignments.status` = `'accepted'`
4. Update `consultation_requests.status` = `'accepted'`
5. Update `consultation_requests.advisor_id` = advisor ID

**Backend Process (Reject)**:
1. Verify assignment belongs to advisor
2. Update `request_assignments.status` = `'declined'`
3. Request remains `pending_advisor` (can be assigned to another advisor)

**Database Changes**:
- `request_assignments.status` updated
- `request_assignments.responded_at` set
- `consultation_requests.status` updated (if accepted)
- `consultation_requests.advisor_id` set (if accepted)
- New row in `request_transitions` (audit)

### Step 4: User Reserves Payment
**Endpoint**: `POST /api/trpc/consultations.reservePayment`

**User Action**: 
- User clicks to pay for consultation
- System calculates amount based on tier discounts

**Backend Process**:
1. Verify request status is `accepted`
2. Call `createPaymentIntentPlaceholder()` (creates pending order)
3. Order created with status `pending`
4. Request status remains `accepted` (payment not completed yet)

**Database Changes**:
- New row in `orders` (status: `pending`, `request_id` linked)
- `orders.gateway_payment_id` set (placeholder)

### Step 5: Payment Completed
**External Process**: MyFatoorah payment gateway callback

**Backend Process**:
1. Payment gateway webhook received
2. Order status updated to `completed`
3. Request status updated to `paid`
4. `consultation_requests.paid_at` timestamp set

**Database Changes**:
- `orders.status` = `'completed'`
- `consultation_requests.status` = `'paid'`
- `consultation_requests.paid_at` set

### Step 6: User Starts Session
**Endpoint**: `POST /api/trpc/consultations.startSession`

**User Action**: 
- User clicks "بدء الجلسة" (Start Session)

**Backend Process**:
1. Verify request status is `paid`
2. Verify payment is completed (check order status)
3. Update request status to `in_progress`
4. Call `startConsultation()`

**Database Changes**:
- `consultation_requests.status` = `'in_progress'`
- New row in `request_transitions` (audit)

### Step 7: User and Advisor Exchange Messages
**Endpoint**: `POST /api/trpc/consultations.addMessage`

**User/Advisor Action**: 
- Either party sends a message

**Backend Process**:
1. Verify sender has access to request
2. For user: Verify request belongs to user
3. For advisor: Verify advisor is assigned
4. Create message in `consultation_messages`
5. If first user message after payment, update status to `in_progress`

**Database Changes**:
- New row in `consultation_messages`
- `consultation_requests.status` = `'in_progress'` (if first message)

### Step 8: Session Completed
**Endpoint**: `POST /api/trpc/consultations.completeSession`

**User/Advisor Action**: 
- Either party marks session as complete

**Backend Process**:
1. Verify request status is `in_progress`
2. Update request status to `completed`
3. Call `completeConsultation()`
4. Set `consultation_requests.closed_at` timestamp

**Database Changes**:
- `consultation_requests.status` = `'completed'`
- `consultation_requests.closed_at` set
- New row in `request_transitions` (audit)

### Step 9: Payment Released to Advisor
**Endpoint**: `POST /api/trpc/consultations.releasePayment`

**Admin/System Action**: 
- Admin or automated system releases payment

**Backend Process**:
1. Verify request status is `completed`
2. Calculate platform fee (30%) and advisor payout (70%)
3. Update request status to `released`
4. Create transaction records for advisor earnings
5. Update advisor ledger/balance

**Database Changes**:
- `consultation_requests.status` = `'released'`
- `orders.vendor_payout_kwd` set
- `orders.platform_fee_kwd` set
- New transaction records in ledger
- New row in `request_transitions` (audit)

## Advisor Dashboard Queries

### New Orders (Pending)
```sql
SELECT r.*, a.id as assignment_id, a.status as assignment_status
FROM request_assignments a
JOIN consultation_requests r ON a.request_id = r.id
WHERE a.advisor_id = ?
  AND a.status = 'offered'
  AND r.status = 'pending_advisor'
```

### Active Orders
```sql
SELECT r.*
FROM consultation_requests r
WHERE r.advisor_id = ?
  AND r.status IN ('paid', 'in_progress')
```

### Completed Orders
```sql
SELECT r.*
FROM consultation_requests r
WHERE r.advisor_id = ?
  AND r.status IN ('completed', 'released')
```

## Common Issues & Fixes

### Issue: Advisor doesn't see requests
**Cause**: Assignment not created after request creation
**Fix**: Automatic assignment now happens in `createConsultationRecord()`

### Issue: "Failed to fetch" on accept/reject
**Cause**: Authentication token not sent or invalid
**Fix**: 
- Check browser console for error details
- Verify token is stored in localStorage
- Check that `Authorization: Bearer <token>` header is sent

### Issue: Request stuck in pending_advisor
**Cause**: No advisor available or assignment failed
**Fix**: 
- Check `consultants` table for active advisors
- Manually create assignment using admin tools

## Testing Checklist

- [x] User creates request → Request appears in database
- [x] Request automatically assigned to advisor
- [x] Advisor sees request in dashboard
- [x] Advisor can accept request
- [x] Advisor can reject request
- [x] After acceptance, request status = `accepted`
- [x] User can reserve payment
- [x] Payment creates order
- [x] After payment, request status = `paid`
- [x] User can start session
- [x] Messages can be exchanged
- [x] Session can be completed
- [x] Payment can be released

## Next Steps for Full Implementation

1. **Payment Gateway Integration**: Replace placeholder with real MyFatoorah integration
2. **Notification System**: Notify advisors when new requests are assigned
3. **Auto-Assignment Logic**: Implement smart matching (currently picks first available)
4. **Multiple Advisor Offers**: Support offering to multiple advisors simultaneously
5. **Assignment Expiration**: Auto-expire assignments after timeout
6. **Rating System**: Allow users to rate completed consultations
