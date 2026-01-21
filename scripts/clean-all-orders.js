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

async function cleanAllOrders() {
  try {
    console.log("🧹 Cleaning all consultation data...");
    
    // Delete in order of dependencies
    await sql`DELETE FROM consultation_messages`;
    console.log("  ✓ Deleted consultation_messages");
    
    await sql`DELETE FROM request_transitions`;
    console.log("  ✓ Deleted request_transitions");
    
    await sql`DELETE FROM request_assignments`;
    console.log("  ✓ Deleted request_assignments");
    
    await sql`DELETE FROM advisor_ratings`;
    console.log("  ✓ Deleted advisor_ratings");
    
    await sql`DELETE FROM orders WHERE request_id IS NOT NULL`;
    console.log("  ✓ Deleted consultation orders");
    
    await sql`DELETE FROM consultation_requests`;
    console.log("  ✓ Deleted consultation_requests");
    
    console.log("\n✅ All consultation data cleaned successfully!");
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error cleaning data:", error.message);
    await sql.end();
    process.exit(1);
  }
}

cleanAllOrders();
