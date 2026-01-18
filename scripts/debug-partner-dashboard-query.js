import postgres from "postgres";
import { config } from "dotenv";

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function debugDashboard() {
  try {
    console.log("🔍 Debugging Partner Dashboard Query\n");
    
    // Get partner consultant
    const consultant = await sql`
      SELECT id, name, email
      FROM consultants
      WHERE email = 'partner@khabeer.com'
    `.then(rows => rows[0]);

    if (!consultant) {
      console.log("❌ Consultant not found");
      await sql.end();
      process.exit(1);
    }

    console.log(`✅ Consultant ID: ${consultant.id} (${consultant.email})\n`);

    // Get all rows that match the WHERE clause (before filtering)
    const rawRows = await sql`
      SELECT 
        cr.id as request_id,
        cr.status as request_status,
        cr.advisor_id,
        ra.id as assignment_id,
        ra.status as assignment_status,
        ra.advisor_id as assignment_advisor_id
      FROM consultation_requests cr
      LEFT JOIN request_assignments ra ON ra.request_id = cr.id
      WHERE ra.advisor_id = ${consultant.id}
    `;

    console.log(`📊 Raw query results (${rawRows.length} rows):`);
    rawRows.forEach((row, idx) => {
      console.log(`\n   ${idx + 1}. Request ID: ${row.request_id}`);
      console.log(`      - Request Status: ${row.request_status}`);
      console.log(`      - Request Advisor ID: ${row.advisor_id || 'NULL'}`);
      console.log(`      - Assignment ID: ${row.assignment_id}`);
      console.log(`      - Assignment Status: ${row.assignment_status}`);
      console.log(`      - Assignment Advisor ID: ${row.assignment_advisor_id}`);
    });

    // Apply the same filters as the dashboard
    console.log("\n🔍 Applying dashboard filters...\n");

    const filtered = rawRows.filter(r => !["declined", "expired"].includes(r.assignment_status));
    console.log(`After removing declined/expired: ${filtered.length} rows`);

    const isNew = (r) =>
      r.assignment_status === "offered" &&
      r.request_status === "pending_advisor" &&
      (r.advisor_id === null || r.advisor_id === undefined);

    const isActive = (r) =>
      r.advisor_id === consultant.id &&
      ["accepted", "payment_reserved", "in_progress", "paid", "awaiting_payment"].includes(r.request_status);

    const isCompleted = (r) =>
      r.advisor_id === consultant.id &&
      ["completed", "closed", "rated", "released"].includes(r.request_status);

    const newOrders = filtered.filter(isNew);
    const activeOrders = filtered.filter(isActive);
    const completedOrders = filtered.filter(isCompleted);

    console.log(`\n📋 Filtered Results:`);
    console.log(`   - New Orders: ${newOrders.length}`);
    newOrders.forEach((r, idx) => {
      console.log(`     ${idx + 1}. Request ID: ${r.request_id} (Status: ${r.request_status})`);
    });

    console.log(`   - Active Orders: ${activeOrders.length}`);
    activeOrders.forEach((r, idx) => {
      console.log(`     ${idx + 1}. Request ID: ${r.request_id} (Status: ${r.request_status})`);
    });

    console.log(`   - Completed Orders: ${completedOrders.length}`);
    completedOrders.forEach((r, idx) => {
      console.log(`     ${idx + 1}. Request ID: ${r.request_id} (Status: ${r.request_status})`);
    });

    // Check why requests are being filtered out
    console.log(`\n🔍 Why requests are filtered out:`);
    filtered.forEach((r) => {
      if (!isNew(r) && !isActive(r) && !isCompleted(r)) {
        console.log(`\n   Request ID: ${r.request_id}`);
        console.log(`   - Assignment Status: ${r.assignment_status}`);
        console.log(`   - Request Status: ${r.request_status}`);
        console.log(`   - Request Advisor ID: ${r.advisor_id || 'NULL'}`);
        console.log(`   - Consultant ID: ${consultant.id}`);
        console.log(`   - isNew check: ${isNew(r)} (needs: offered + pending_advisor + advisor_id NULL)`);
        console.log(`   - isActive check: ${isActive(r)} (needs: advisor_id=${consultant.id} + status in [accepted, payment_reserved, ...])`);
        console.log(`   - isCompleted check: ${isCompleted(r)} (needs: advisor_id=${consultant.id} + status in [completed, closed, ...])`);
      }
    });

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    await sql.end();
    process.exit(1);
  }
}

debugDashboard();
