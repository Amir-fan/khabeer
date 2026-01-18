import postgres from "postgres";
import { config } from "dotenv";

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function testFullJourney() {
  try {
    console.log("🧪 Testing Full Consultation Request Journey\n");
    console.log("=" .repeat(60));

    // Step 1: Find or create a test user
    console.log("\n📝 STEP 1: Finding test user...");
    let testUser = await sql`
      SELECT id, email, name, role, tier
      FROM users
      WHERE email LIKE 'test%' OR email = 'admin@khabeer.com'
      ORDER BY created_at DESC
      LIMIT 1
    `.then(rows => rows[0]);

    if (!testUser) {
      console.log("   ⚠️  No test user found, using first available user...");
      testUser = await sql`
        SELECT id, email, name, role, tier
        FROM users
        ORDER BY created_at DESC
        LIMIT 1
      `.then(rows => rows[0]);
    }

    if (!testUser) {
      throw new Error("No users found in database");
    }

    console.log(`   ✅ Using user: ${testUser.email} (ID: ${testUser.id}, Tier: ${testUser.tier})`);

    // Step 2: Check latest consultation request
    console.log("\n📝 STEP 2: Checking latest consultation request...");
    const latestRequest = await sql`
      SELECT 
        cr.id,
        cr.user_id,
        cr.status,
        cr.gross_amount_kwd,
        cr.net_amount_kwd,
        cr.summary,
        cr.advisor_id,
        cr.created_at,
        u.email as user_email
      FROM consultation_requests cr
      LEFT JOIN users u ON cr.user_id = u.id
      ORDER BY cr.created_at DESC
      LIMIT 1
    `.then(rows => rows[0]);

    if (!latestRequest) {
      console.log("   ⚠️  No consultation requests found. User needs to create one via the app.");
      console.log("   💡 To test: Go to the app, select a service, and submit a consultation request.");
      await sql.end();
      process.exit(0);
    }

    console.log(`   ✅ Found request ID: ${latestRequest.id}`);
    console.log(`      - User: ${latestRequest.user_email} (ID: ${latestRequest.user_id})`);
    console.log(`      - Status: ${latestRequest.status}`);
    console.log(`      - Amount: ${latestRequest.gross_amount_kwd || 0} KWD`);
    console.log(`      - Advisor ID: ${latestRequest.advisor_id || 'Not assigned'}`);
    console.log(`      - Created: ${latestRequest.created_at}`);

    // Step 3: Check if order exists for this request
    console.log("\n📝 STEP 3: Checking if order exists for this request...");
    const order = await sql`
      SELECT 
        id,
        request_id,
        user_id,
        service_type,
        status,
        price_kwd,
        net_amount_kwd,
        gateway,
        gateway_reference,
        created_at
      FROM orders
      WHERE request_id = ${latestRequest.id}
      ORDER BY created_at DESC
      LIMIT 1
    `.then(rows => rows[0]);

    if (order) {
      console.log(`   ✅ Order found! ID: ${order.id}`);
      console.log(`      - Status: ${order.status}`);
      console.log(`      - Amount: ${order.price_kwd || 0} KWD`);
      console.log(`      - Gateway: ${order.gateway || 'N/A'}`);
      console.log(`      - Gateway Reference: ${order.gateway_reference || 'N/A'}`);
      console.log(`      - Created: ${order.created_at}`);
    } else {
      console.log(`   ⚠️  No order found for request ID: ${latestRequest.id}`);
      
      if (latestRequest.status === 'accepted') {
        console.log(`   💡 Request is accepted but no order created yet.`);
        console.log(`   💡 User needs to call 'consultations.reservePayment' to create an order.`);
      } else if (latestRequest.status === 'pending_advisor') {
        console.log(`   💡 Request is pending advisor acceptance.`);
        console.log(`   💡 An advisor needs to accept the request first.`);
      } else {
        console.log(`   💡 Current status: ${latestRequest.status}`);
      }
    }

    // Step 4: Check request assignments
    console.log("\n📝 STEP 4: Checking advisor assignments...");
    const assignments = await sql`
      SELECT 
        ra.id,
        ra.request_id,
        ra.advisor_id,
        ra.status as assignment_status,
        ra.created_at,
        c.name as advisor_name,
        c.email as advisor_email
      FROM request_assignments ra
      LEFT JOIN consultants c ON ra.advisor_id = c.id
      WHERE ra.request_id = ${latestRequest.id}
      ORDER BY ra.created_at DESC
    `;

    if (assignments.length > 0) {
      console.log(`   ✅ Found ${assignments.length} assignment(s):`);
      assignments.forEach((assign, idx) => {
        console.log(`      ${idx + 1}. Advisor: ${assign.advisor_name || assign.advisor_email || assign.advisor_id}`);
        console.log(`         Status: ${assign.assignment_status}`);
        console.log(`         Created: ${assign.created_at}`);
      });
    } else {
      console.log(`   ⚠️  No assignments found for this request.`);
      console.log(`   💡 The system should create assignments when a request is submitted.`);
    }

    // Step 5: Summary and recommendations
    console.log("\n" + "=".repeat(60));
    console.log("📊 JOURNEY STATUS SUMMARY");
    console.log("=".repeat(60));

    const statusFlow = {
      'pending_advisor': '✅ Request created → Waiting for advisor acceptance',
      'accepted': '✅ Request accepted → Waiting for payment reservation',
      'payment_reserved': '✅ Payment reserved → Order should exist',
      'in_progress': '✅ Consultation in progress',
      'completed': '✅ Consultation completed → Waiting for payment release',
      'released': '✅ Payment released → Journey complete',
    };

    const currentStatus = latestRequest.status;
    const statusMessage = statusFlow[currentStatus] || `⚠️  Unknown status: ${currentStatus}`;
    
    console.log(`\nCurrent Status: ${currentStatus}`);
    console.log(`Status Meaning: ${statusMessage}`);

    if (!order && ['accepted', 'payment_reserved', 'in_progress'].includes(currentStatus)) {
      console.log(`\n❌ ISSUE FOUND: Request is in '${currentStatus}' status but no order exists!`);
      console.log(`   This indicates the payment reservation step may have failed.`);
    } else if (order && order.status === 'pending' && currentStatus === 'accepted') {
      console.log(`\n✅ CORRECT: Order exists with 'pending' status (payment not yet completed)`);
    } else if (order && order.status === 'completed' && ['in_progress', 'completed', 'released'].includes(currentStatus)) {
      console.log(`\n✅ CORRECT: Order is completed and consultation is progressing`);
    } else if (!order && currentStatus === 'pending_advisor') {
      console.log(`\n✅ CORRECT: No order yet (waiting for advisor acceptance)`);
    } else if (!order && currentStatus === 'accepted') {
      console.log(`\n⚠️  WARNING: Request accepted but no order. User should call reservePayment.`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Test completed!");
    console.log("=".repeat(60));

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error);
    await sql.end();
    process.exit(1);
  }
}

testFullJourney();
