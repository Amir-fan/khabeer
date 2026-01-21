import postgres from "postgres";
import { config } from "dotenv";

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });
const API_BASE = "http://localhost:3000";

async function testFullJourney() {
  try {
    console.log("🧪 Testing Full Consultation Journey\n");
    console.log("=".repeat(60));

    // Step 1: Find a test user
    console.log("\n📋 Step 1: Finding test user...");
    const users = await sql`SELECT id, email, role FROM users WHERE role = 'user' LIMIT 1`;
    if (users.length === 0) {
      console.error("❌ No test user found. Please create a user first.");
      await sql.end();
      process.exit(1);
    }
    const testUser = users[0];
    console.log(`  ✓ Found user: ${testUser.email} (ID: ${testUser.id})`);

    // Step 2: Find an active advisor
    console.log("\n📋 Step 2: Finding active advisor...");
    const advisors = await sql`
      SELECT c.id, c.email, c.name
      FROM consultants c
      WHERE c.status = 'active'
      LIMIT 1
    `;
    if (advisors.length === 0) {
      console.error("❌ No active advisor found. Please create an advisor first.");
      await sql.end();
      process.exit(1);
    }
    const advisor = advisors[0];
    console.log(`  ✓ Found advisor: ${advisor.email} (Consultant ID: ${advisor.id})`);

    // Step 3: Create a consultation request (simulate user action)
    console.log("\n📋 Step 3: Creating consultation request...");
    const requestResult = await sql`
      INSERT INTO consultation_requests (
        user_id, 
        user_tier_snapshot, 
        status, 
        priority_weight, 
        discount_rate_bps,
        gross_amount_kwd,
        discount_amount_kwd,
        net_amount_kwd,
        currency,
        summary
      ) VALUES (
        ${testUser.id},
        'free',
        'submitted',
        0,
        0,
        10000,
        0,
        10000,
        'KWD',
        'Test consultation request for full journey test'
      )
      RETURNING id, status
    `;
    const request = requestResult[0];
    console.log(`  ✓ Created request ID: ${request.id}, Status: ${request.status}`);

    // Step 4: Update status to pending_advisor
    console.log("\n📋 Step 4: Updating status to pending_advisor...");
    await sql`
      UPDATE consultation_requests 
      SET status = 'pending_advisor', updated_at = now()
      WHERE id = ${request.id}
    `;
    console.log("  ✓ Status updated to pending_advisor");

    // Step 5: Create assignment (simulate automatic assignment)
    console.log("\n📋 Step 5: Creating assignment for advisor...");
    const assignmentResult = await sql`
      INSERT INTO request_assignments (
        request_id,
        advisor_id,
        rank,
        status
      ) VALUES (
        ${request.id},
        ${advisor.id},
        1,
        'offered'
      )
      RETURNING id, status
    `;
    const assignment = assignmentResult[0];
    console.log(`  ✓ Created assignment ID: ${assignment.id}, Status: ${assignment.status}`);

    // Step 6: Check what advisor sees in dashboard
    console.log("\n📋 Step 6: Checking advisor dashboard data...");
    const dashboardData = await sql`
      SELECT 
        r.id as request_id,
        r.status as request_status,
        r.summary,
        r.net_amount_kwd,
        a.id as assignment_id,
        a.status as assignment_status
      FROM request_assignments a
      JOIN consultation_requests r ON a.request_id = r.id
      WHERE a.advisor_id = ${advisor.id}
        AND a.status = 'offered'
        AND r.status = 'pending_advisor'
    `;
    console.log(`  ✓ Advisor has ${dashboardData.length} pending order(s)`);
    if (dashboardData.length > 0) {
      console.log(`  ✓ Request ID ${dashboardData[0].request_id} is visible to advisor`);
    }

    // Step 7: Simulate advisor accepting
    console.log("\n📋 Step 7: Simulating advisor acceptance...");
    await sql`
      UPDATE request_assignments 
      SET status = 'accepted', responded_at = now()
      WHERE id = ${assignment.id}
    `;
    await sql`
      UPDATE consultation_requests 
      SET status = 'accepted', advisor_id = ${advisor.id}, updated_at = now()
      WHERE id = ${request.id}
    `;
    console.log("  ✓ Assignment accepted, request status updated to accepted");

    // Step 8: Check final state
    console.log("\n📋 Step 8: Verifying final state...");
    const finalRequest = await sql`
      SELECT r.*, a.status as assignment_status
      FROM consultation_requests r
      LEFT JOIN request_assignments a ON r.id = a.request_id AND a.advisor_id = ${advisor.id}
      WHERE r.id = ${request.id}
    `;
    const final = finalRequest[0];
    console.log(`  ✓ Request Status: ${final.status}`);
    console.log(`  ✓ Advisor ID: ${final.advisor_id}`);
    console.log(`  ✓ Assignment Status: ${final.assignment_status}`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ Full Journey Test Complete!");
    console.log("\nSummary:");
    console.log(`  - Request ID: ${request.id}`);
    console.log(`  - Assignment ID: ${assignment.id}`);
    console.log(`  - Advisor ID: ${advisor.id}`);
    console.log(`  - Final Status: ${final.status}`);
    console.log("\n💡 Next steps:");
    console.log("  1. User should call consultations.reservePayment");
    console.log("  2. After payment, status becomes 'paid'");
    console.log("  3. User can start session (status -> 'in_progress')");
    console.log("  4. Advisor and user can exchange messages");
    console.log("  5. After completion, status -> 'completed'");
    console.log("  6. After release, status -> 'released' (advisor gets paid)");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await sql.end();
    process.exit(1);
  }
}

testFullJourney();
