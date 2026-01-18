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

async function checkPartnerDashboard() {
  try {
    console.log("🔍 Checking Partner Dashboard Data\n");
    console.log("=".repeat(60));

    // 1. Find the partner user account
    console.log("\n1️⃣ Finding partner@khabeer.com account...");
    const partnerUser = await sql`
      SELECT id, email, name, role, tier
      FROM users
      WHERE email = 'partner@khabeer.com'
    `.then(rows => rows[0]);

    if (!partnerUser) {
      console.log("   ❌ Partner user not found!");
      await sql.end();
      process.exit(1);
    }

    console.log(`   ✅ Found partner user:`);
    console.log(`      - ID: ${partnerUser.id}`);
    console.log(`      - Email: ${partnerUser.email}`);
    console.log(`      - Role: ${partnerUser.role}`);
    console.log(`      - Name: ${partnerUser.name || 'N/A'}`);

    // 2. Find the consultant/advisor record linked to this user
    console.log("\n2️⃣ Finding consultant/advisor record...");
    const consultant = await sql`
      SELECT id, name, email, status
      FROM consultants
      WHERE email = 'partner@khabeer.com'
    `.then(rows => rows[0]);

    if (!consultant) {
      console.log("   ❌ No consultant record found for this partner!");
      console.log("   💡 The partner account needs to be linked to a consultant record.");
      console.log("   💡 Check if the partner application was approved and linked correctly.");
    } else {
      console.log(`   ✅ Found consultant record:`);
      console.log(`      - Consultant ID: ${consultant.id}`);
      console.log(`      - User ID: ${consultant.user_id}`);
      console.log(`      - Name: ${consultant.name || 'N/A'}`);
      console.log(`      - Email: ${consultant.email || 'N/A'}`);
      console.log(`      - Status: ${consultant.status || 'N/A'}`);

      // 3. Check request assignments for this advisor
      console.log("\n3️⃣ Checking request assignments for this advisor...");
      const assignments = await sql`
        SELECT 
          ra.id,
          ra.request_id,
          ra.advisor_id,
          ra.status as assignment_status,
          ra.created_at,
          cr.id as request_id_check,
          cr.status as request_status,
          cr.user_id as request_user_id,
          cr.gross_amount_kwd,
          cr.summary
        FROM request_assignments ra
        LEFT JOIN consultation_requests cr ON ra.request_id = cr.id
        WHERE ra.advisor_id = ${consultant.id}
        ORDER BY ra.created_at DESC
      `;

      console.log(`   Found ${assignments.length} assignment(s) for this advisor:`);
      if (assignments.length === 0) {
        console.log("   ⚠️  No assignments found!");
        console.log("   💡 This advisor hasn't been assigned to any consultation requests yet.");
      } else {
        assignments.forEach((assign, idx) => {
          console.log(`\n   ${idx + 1}. Assignment ID: ${assign.id}`);
          console.log(`      - Request ID: ${assign.request_id}`);
          console.log(`      - Assignment Status: ${assign.assignment_status}`);
          console.log(`      - Request Status: ${assign.request_status || 'N/A'}`);
          console.log(`      - Amount: ${assign.gross_amount_kwd || 0} KWD`);
          console.log(`      - Summary: ${(assign.summary || '').substring(0, 50)}...`);
          console.log(`      - Created: ${assign.created_at}`);
        });
      }

      // 4. Check what the partner dashboard query would return
      console.log("\n4️⃣ Simulating partner dashboard query...");
      const dashboardData = await sql`
        SELECT 
          cr.id as request_id,
          cr.status as request_status,
          cr.gross_amount_kwd,
          cr.net_amount_kwd,
          cr.summary,
          cr.created_at,
          ra.id as assignment_id,
          ra.status as assignment_status,
          u.email as user_email
        FROM consultation_requests cr
        LEFT JOIN request_assignments ra ON ra.request_id = cr.id
        LEFT JOIN users u ON cr.user_id = u.id
        WHERE ra.advisor_id = ${consultant.id}
        ORDER BY cr.created_at DESC
      `;

      console.log(`   Dashboard would show ${dashboardData.length} request(s):`);
      if (dashboardData.length === 0) {
        console.log("   ⚠️  Dashboard is empty!");
        console.log("   💡 This is why you can't see anything in the partner dashboard.");
      } else {
        dashboardData.forEach((req, idx) => {
          console.log(`\n   ${idx + 1}. Request ID: ${req.request_id}`);
          console.log(`      - Status: ${req.request_status}`);
          console.log(`      - Assignment Status: ${req.assignment_status}`);
          console.log(`      - User: ${req.user_email}`);
          console.log(`      - Amount: ${req.gross_amount_kwd || 0} KWD`);
        });
      }

      // 5. Check all consultation requests (to see if there are any that should be assigned)
      console.log("\n5️⃣ Checking all consultation requests...");
      const allRequests = await sql`
        SELECT 
          cr.id,
          cr.status,
          cr.advisor_id,
          cr.gross_amount_kwd,
          cr.created_at,
          COUNT(ra.id) as assignment_count
        FROM consultation_requests cr
        LEFT JOIN request_assignments ra ON ra.request_id = cr.id
        GROUP BY cr.id, cr.status, cr.advisor_id, cr.gross_amount_kwd, cr.created_at
        ORDER BY cr.created_at DESC
        LIMIT 5
      `;

      console.log(`   Found ${allRequests.length} recent consultation requests:`);
      allRequests.forEach((req, idx) => {
        console.log(`\n   ${idx + 1}. Request ID: ${req.id}`);
        console.log(`      - Status: ${req.status}`);
        console.log(`      - Advisor ID: ${req.advisor_id || 'Not assigned'}`);
        console.log(`      - Assignment Count: ${req.assignment_count}`);
        console.log(`      - Amount: ${req.gross_amount_kwd || 0} KWD`);
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Check completed!");
    console.log("=".repeat(60));

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Check failed:", error.message);
    console.error(error);
    await sql.end();
    process.exit(1);
  }
}

checkPartnerDashboard();
