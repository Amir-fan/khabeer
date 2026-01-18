import postgres from "postgres";
import { config } from "dotenv";

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function checkPending() {
  try {
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

    console.log(`✅ Checking pending requests for: ${consultant.email} (ID: ${consultant.id})\n`);

    // Check for pending requests that this partner was offered
    const pending = await sql`
      SELECT 
        cr.id,
        cr.status,
        cr.gross_amount_kwd,
        cr.summary,
        cr.created_at,
        ra.status as assignment_status
      FROM consultation_requests cr
      LEFT JOIN request_assignments ra ON ra.request_id = cr.id
      WHERE ra.advisor_id = ${consultant.id}
        AND cr.status = 'pending_advisor'
        AND ra.status = 'offered'
      ORDER BY cr.created_at DESC
    `;

    console.log(`📋 Pending requests (should show in "New Orders"): ${pending.length}\n`);
    
    if (pending.length === 0) {
      console.log("   ⚠️  No pending requests found!");
      console.log("   💡 This is why the dashboard is empty.");
      console.log("   💡 The only request (ID: 4) was already accepted by another advisor.");
      console.log("\n   💡 To test the dashboard:");
      console.log("      1. Create a new consultation request via the app");
      console.log("      2. The system should offer it to partner@khabeer.com");
      console.log("      3. It should appear in the 'New Orders' section");
    } else {
      pending.forEach((r, idx) => {
        console.log(`   ${idx + 1}. Request ID: ${r.id}`);
        console.log(`      - Amount: ${r.gross_amount_kwd || 0} KWD`);
        console.log(`      - Summary: ${(r.summary || '').substring(0, 50)}...`);
        console.log(`      - Created: ${r.created_at}`);
      });
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await sql.end();
    process.exit(1);
  }
}

checkPending();
