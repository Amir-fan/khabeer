import postgres from "postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

console.log("🔄 Running request_status enum migration...");

const sql = postgres(DATABASE_URL);

try {
  // Read the SQL file
  const sqlFile = readFileSync(join(__dirname, "../drizzle/0006_add_missing_request_status_enum_values.sql"), "utf-8");
  
  // Execute the migration
  console.log("📦 Adding missing enum values to request_status...");
  await sql.unsafe(sqlFile);
  
  console.log("✅ Migration completed successfully!");
  await sql.end();
  process.exit(0);
} catch (error) {
  console.error("❌ Migration failed:", error.message);
  await sql.end();
  process.exit(1);
}
