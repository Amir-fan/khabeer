import postgres from "postgres";
import { config } from "dotenv";

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function createTestAssignment() {
  try {
    // Find partner consultant
    const consultant = await sql`
      SELECT id, email
      FROM consultants
      WHERE email = 'partner@khabeer.com'
    `.then(rows => rows[0]);

    if (!consultant) {
      console.log("❌ Consultant not found");
      await sql.end();
      process.exit(1);
    }

    // Find a pending request that doesn't have an assignment for this partner
    const pendingRequest = await sql`
      SELECT cr.id, cr.status, cr.gross_amount_kwd
      FROM consultation_requests cr
      WHERE cr.status = 'pending_advisor'
        AND cr.id NOT IN (
          SELECT request_id 
          FROM request_assignments 
          WHERE advisor_id = ${consultant.id}
        )
      ORDER BY cr.created_at DESC
      LIMIT 1
    `.then(rows => rows[0]);

    if (!pendingRequest) {
      console.log("⚠️  No pending requests available to assign");
      console.log("💡 All pending requests already have assignments for this partner");
      await sql.end();
      process.exit(0);
    }

    console.log(`✅ Found pending request ID: ${pendingRequest.id}`);
    console.log(`   Amount: ${pendingRequest.gross_amount_kwd || 0} KWD\n`);

    // Create assignment
    const assignment = await sql`
      INSERT INTO request_assignments (request_id, advisor_id, rank, status)
      VALUES (${pendingRequest.id}, ${consultant.id}, 1, 'offered')
      RETURNING id, request_id, advisor_id, status
    `.then(rows => rows[0]);

    console.log(`✅ Created assignment:`);
    console.log(`   - Assignment ID: ${assignment.id}`);
    console.log(`   - Request ID: ${assignment.request_id}`);
    console.log(`   - Advisor ID: ${assignment.advisor_id}`);
    console.log(`   - Status: ${assignment.status}`);
    console.log(`\n💡 Now refresh the partner dashboard - you should see this request in "New Orders"`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await sql.end();
    process.exit(1);
  }
}

createTestAssignment();
