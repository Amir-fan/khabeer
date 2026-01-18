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

async function testConsultationFlow() {
  try {
    console.log("🧪 Testing Consultation Request Flow\n");

    // 1. Check existing consultation requests
    console.log("1️⃣ Checking existing consultation requests...");
    const existingRequests = await sql`
      SELECT 
        cr.id,
        cr.user_id,
        cr.status,
        cr.gross_amount_kwd,
        cr.net_amount_kwd,
        cr.summary,
        cr.created_at,
        u.email as user_email,
        u.name as user_name
      FROM consultation_requests cr
      LEFT JOIN users u ON cr.user_id = u.id
      ORDER BY cr.created_at DESC
      LIMIT 5
    `;
    
    console.log(`   Found ${existingRequests.length} recent consultation requests:`);
    existingRequests.forEach((req, idx) => {
      console.log(`   ${idx + 1}. ID: ${req.id} | User: ${req.user_email || req.user_name || req.user_id} | Status: ${req.status} | Amount: ${req.gross_amount_kwd || 0} KWD | Created: ${req.created_at}`);
    });

    // 2. Check orders related to consultation requests
    console.log("\n2️⃣ Checking orders for consultation requests...");
    const orders = await sql`
      SELECT 
        o.id,
        o.request_id,
        o.user_id,
        o.service_type,
        o.status,
        o.price_kwd,
        o.net_amount_kwd,
        o.created_at,
        cr.status as request_status
      FROM orders o
      LEFT JOIN consultation_requests cr ON o.request_id = cr.id
      WHERE o.request_id IS NOT NULL
      ORDER BY o.created_at DESC
      LIMIT 5
    `;
    
    console.log(`   Found ${orders.length} orders linked to consultation requests:`);
    orders.forEach((order, idx) => {
      console.log(`   ${idx + 1}. Order ID: ${order.id} | Request ID: ${order.request_id} | Status: ${order.status} | Amount: ${order.price_kwd || 0} KWD | Request Status: ${order.request_status || 'N/A'}`);
    });

    // 3. Check request assignments (advisor offers)
    console.log("\n3️⃣ Checking request assignments (advisor offers)...");
    const assignments = await sql`
      SELECT 
        ra.id,
        ra.request_id,
        ra.advisor_id,
        ra.status as assignment_status,
        ra.created_at,
        cr.status as request_status,
        c.name as advisor_name
      FROM request_assignments ra
      LEFT JOIN consultation_requests cr ON ra.request_id = cr.id
      LEFT JOIN consultants c ON ra.advisor_id = c.id
      ORDER BY ra.created_at DESC
      LIMIT 5
    `;
    
    console.log(`   Found ${assignments.length} request assignments:`);
    assignments.forEach((assign, idx) => {
      console.log(`   ${idx + 1}. Assignment ID: ${assign.id} | Request ID: ${assign.request_id} | Advisor: ${assign.advisor_name || assign.advisor_id} | Status: ${assign.assignment_status} | Request Status: ${assign.request_status || 'N/A'}`);
    });

    // 4. Summary statistics
    console.log("\n4️⃣ Summary Statistics:");
    const stats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE cr.status = 'pending_advisor') as pending_advisor,
        COUNT(*) FILTER (WHERE cr.status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE cr.status = 'awaiting_payment') as awaiting_payment,
        COUNT(*) FILTER (WHERE cr.status = 'paid') as paid,
        COUNT(*) FILTER (WHERE cr.status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE cr.status = 'completed') as completed,
        COUNT(*) FILTER (WHERE cr.status = 'released') as released,
        COUNT(*) as total_requests
      FROM consultation_requests cr
    `;
    
    const s = stats[0];
    console.log(`   Total Requests: ${s.total_requests}`);
    console.log(`   - Pending Advisor: ${s.pending_advisor}`);
    console.log(`   - Accepted: ${s.accepted}`);
    console.log(`   - Awaiting Payment: ${s.awaiting_payment}`);
    console.log(`   - Paid: ${s.paid}`);
    console.log(`   - In Progress: ${s.in_progress}`);
    console.log(`   - Completed: ${s.completed}`);
    console.log(`   - Released: ${s.released}`);

    // 5. Check orders statistics
    console.log("\n5️⃣ Orders Statistics:");
    const orderStats = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE o.status = 'pending') as pending_orders,
        COUNT(*) FILTER (WHERE o.status = 'completed') as completed_orders,
        COUNT(*) as total_orders
      FROM orders o
      WHERE o.request_id IS NOT NULL
    `;
    
    const os = orderStats[0];
    console.log(`   Total Orders (for consultations): ${os.total_orders}`);
    console.log(`   - Pending: ${os.pending_orders}`);
    console.log(`   - Completed: ${os.completed_orders}`);

    // 6. Check for orphaned requests (requests without orders when they should have them)
    console.log("\n6️⃣ Checking for requests that should have orders but don't:");
    const orphaned = await sql`
      SELECT 
        cr.id,
        cr.status,
        cr.gross_amount_kwd,
        cr.created_at
      FROM consultation_requests cr
      LEFT JOIN orders o ON o.request_id = cr.id
      WHERE cr.status IN ('awaiting_payment', 'paid', 'in_progress', 'completed', 'released')
        AND o.id IS NULL
      ORDER BY cr.created_at DESC
      LIMIT 5
    `;
    
    if (orphaned.length > 0) {
      console.log(`   ⚠️  Found ${orphaned.length} requests that should have orders:`);
      orphaned.forEach((req) => {
        console.log(`   - Request ID: ${req.id} | Status: ${req.status} | Amount: ${req.gross_amount_kwd || 0} KWD`);
      });
    } else {
      console.log(`   ✅ No orphaned requests found`);
    }

    console.log("\n✅ Test completed successfully!");
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error);
    await sql.end();
    process.exit(1);
  }
}

testConsultationFlow();
