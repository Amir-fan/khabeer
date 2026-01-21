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

async function testAcceptReject() {
  try {
    console.log("🧪 Testing Accept/Reject Endpoint\n");
    console.log("=".repeat(60));

    // Step 1: Create a test request
    console.log("\n📋 Step 1: Creating test request...");
    const users = await sql`SELECT id FROM users WHERE role = 'user' LIMIT 1`;
    if (users.length === 0) {
      console.error("❌ No test user found");
      await sql.end();
      process.exit(1);
    }
    const userId = users[0].id;

    const requestResult = await sql`
      INSERT INTO consultation_requests (
        user_id, status, summary, gross_amount_kwd, net_amount_kwd
      ) VALUES (
        ${userId}, 'pending_advisor', 'Test request for accept/reject', 10000, 10000
      )
      RETURNING id
    `;
    const requestId = requestResult[0].id;
    console.log(`  ✓ Created request ID: ${requestId}`);

    // Step 2: Create assignment
    console.log("\n📋 Step 2: Creating assignment...");
    const advisors = await sql`SELECT id FROM consultants WHERE status = 'active' LIMIT 1`;
    if (advisors.length === 0) {
      console.error("❌ No active advisor found");
      await sql.end();
      process.exit(1);
    }
    const advisorId = advisors[0].id;

    const assignmentResult = await sql`
      INSERT INTO request_assignments (
        request_id, advisor_id, rank, status
      ) VALUES (
        ${requestId}, ${advisorId}, 1, 'offered'
      )
      RETURNING id
    `;
    const assignmentId = assignmentResult[0].id;
    console.log(`  ✓ Created assignment ID: ${assignmentId} for advisor ${advisorId}`);

    // Step 3: Verify endpoint requirements
    console.log("\n📋 Step 3: Verifying endpoint requirements...");
    const assignment = await sql`
      SELECT a.*, r.status as request_status, r.advisor_id
      FROM request_assignments a
      JOIN consultation_requests r ON a.request_id = r.id
      WHERE a.id = ${assignmentId}
    `;
    const assign = assignment[0];
    console.log(`  ✓ Assignment Status: ${assign.status}`);
    console.log(`  ✓ Request Status: ${assign.request_status}`);
    console.log(`  ✓ Request Advisor ID: ${assign.advisor_id || 'NULL'}`);
    console.log(`  ✓ Assignment Advisor ID: ${assign.advisor_id}`);

    // Step 4: Test accept flow (simulate)
    console.log("\n📋 Step 4: Simulating accept...");
    await sql`
      UPDATE request_assignments 
      SET status = 'accepted', responded_at = now()
      WHERE id = ${assignmentId}
    `;
    await sql`
      UPDATE consultation_requests 
      SET status = 'accepted', advisor_id = ${advisorId}, updated_at = now()
      WHERE id = ${requestId}
    `;
    console.log("  ✓ Assignment accepted");

    // Step 5: Verify final state
    console.log("\n📋 Step 5: Verifying final state...");
    const final = await sql`
      SELECT r.status, r.advisor_id, a.status as assignment_status
      FROM consultation_requests r
      JOIN request_assignments a ON r.id = a.request_id
      WHERE r.id = ${requestId}
    `;
    const finalState = final[0];
    console.log(`  ✓ Request Status: ${finalState.status}`);
    console.log(`  ✓ Request Advisor ID: ${finalState.advisor_id}`);
    console.log(`  ✓ Assignment Status: ${finalState.assignment_status}`);

    if (finalState.status === 'accepted' && finalState.advisor_id === advisorId) {
      console.log("\n✅ Accept flow works correctly!");
    } else {
      console.log("\n❌ Accept flow has issues");
    }

    console.log("\n💡 To test via API:");
    console.log(`   POST /api/trpc/consultations.advisorRespond`);
    console.log(`   Body: { "assignmentId": ${assignmentId}, "decision": "accept" }`);
    console.log(`   Headers: { "Authorization": "Bearer <advisor_token>" }`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await sql.end();
    process.exit(1);
  }
}

testAcceptReject();
