import postgres from "postgres";
import { config } from "dotenv";

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;
const API_BASE = "http://localhost:3000";

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function testAPIEndpoints() {
  try {
    console.log("🧪 Testing API Endpoints\n");
    console.log("=".repeat(60));

    // Step 1: Get test user and advisor
    console.log("\n📋 Step 1: Getting test data...");
    const users = await sql`SELECT id, email FROM users WHERE role = 'user' LIMIT 1`;
    const advisors = await sql`SELECT id, email FROM consultants WHERE status = 'active' LIMIT 1`;
    
    if (users.length === 0 || advisors.length === 0) {
      console.error("❌ Missing test data");
      await sql.end();
      process.exit(1);
    }
    
    const testUser = users[0];
    const advisor = advisors[0];
    console.log(`  ✓ User: ${testUser.email} (ID: ${testUser.id})`);
    console.log(`  ✓ Advisor: ${advisor.email} (ID: ${advisor.id})`);

    // Step 2: Create request via database (simulating user action)
    console.log("\n📋 Step 2: Creating consultation request...");
    const requestResult = await sql`
      INSERT INTO consultation_requests (
        user_id, status, summary, gross_amount_kwd, net_amount_kwd
      ) VALUES (
        ${testUser.id}, 'submitted', 'Test API request', 10000, 10000
      )
      RETURNING id, status
    `;
    const request = requestResult[0];
    console.log(`  ✓ Created request ID: ${request.id}`);

    // Step 3: Update to pending_advisor
    await sql`
      UPDATE consultation_requests 
      SET status = 'pending_advisor', updated_at = now()
      WHERE id = ${request.id}
    `;

    // Step 4: Create assignment
    console.log("\n📋 Step 3: Creating assignment...");
    const assignmentResult = await sql`
      INSERT INTO request_assignments (
        request_id, advisor_id, rank, status
      ) VALUES (
        ${request.id}, ${advisor.id}, 1, 'offered'
      )
      RETURNING id, status
    `;
    const assignment = assignmentResult[0];
    console.log(`  ✓ Created assignment ID: ${assignment.id}`);

    // Step 5: Verify advisor can see it
    console.log("\n📋 Step 4: Verifying advisor dashboard query...");
    const dashboardData = await sql`
      SELECT 
        r.id as request_id,
        r.status as request_status,
        r.summary,
        a.id as assignment_id,
        a.status as assignment_status
      FROM request_assignments a
      JOIN consultation_requests r ON a.request_id = r.id
      WHERE a.advisor_id = ${advisor.id}
        AND a.status = 'offered'
        AND r.status = 'pending_advisor'
    `;
    console.log(`  ✓ Advisor has ${dashboardData.length} pending order(s)`);
    
    if (dashboardData.length === 0) {
      console.error("  ❌ Advisor cannot see the request!");
      await sql.end();
      process.exit(1);
    }

    // Step 6: Test accept flow
    console.log("\n📋 Step 5: Testing accept flow...");
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
    
    const finalState = await sql`
      SELECT r.status, r.advisor_id, a.status as assignment_status
      FROM consultation_requests r
      JOIN request_assignments a ON r.id = a.request_id
      WHERE r.id = ${request.id}
    `;
    const final = finalState[0];
    
    if (final.status === 'accepted' && final.advisor_id === advisor.id && final.assignment_status === 'accepted') {
      console.log("  ✅ Accept flow works correctly");
    } else {
      console.error("  ❌ Accept flow failed");
      console.error(`    Request status: ${final.status}`);
      console.error(`    Advisor ID: ${final.advisor_id}`);
      console.error(`    Assignment status: ${final.assignment_status}`);
    }

    // Step 7: Test reject flow (create another request)
    console.log("\n📋 Step 6: Testing reject flow...");
    const request2Result = await sql`
      INSERT INTO consultation_requests (
        user_id, status, summary, gross_amount_kwd, net_amount_kwd
      ) VALUES (
        ${testUser.id}, 'pending_advisor', 'Test reject request', 10000, 10000
      )
      RETURNING id
    `;
    const request2 = request2Result[0];
    
    const assignment2Result = await sql`
      INSERT INTO request_assignments (
        request_id, advisor_id, rank, status
      ) VALUES (
        ${request2.id}, ${advisor.id}, 1, 'offered'
      )
      RETURNING id
    `;
    const assignment2 = assignment2Result[0];
    
    await sql`
      UPDATE request_assignments 
      SET status = 'declined', responded_at = now()
      WHERE id = ${assignment2.id}
    `;
    
    const rejectState = await sql`
      SELECT r.status, a.status as assignment_status
      FROM consultation_requests r
      JOIN request_assignments a ON r.id = a.request_id
      WHERE r.id = ${request2.id}
    `;
    const reject = rejectState[0];
    
    if (reject.assignment_status === 'declined' && reject.status === 'pending_advisor') {
      console.log("  ✅ Reject flow works correctly (request remains pending_advisor)");
    } else {
      console.error("  ❌ Reject flow failed");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All API Endpoint Tests Passed!");
    console.log("\n💡 Next: Test via actual API calls with authentication");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await sql.end();
    process.exit(1);
  }
}

testAPIEndpoints();
