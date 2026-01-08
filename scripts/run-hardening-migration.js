import postgres from "postgres";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

console.log("🔄 Running hardening migration...");

const sql = postgres(DATABASE_URL);

try {
  // Read the SQL file
  const sqlFile = readFileSync(join(__dirname, "../server/drizzle/hardeningPatch.sql"), "utf-8");
  
  // Execute statements in correct order
  // 1. Create enum first
  console.log("📦 Creating withdrawal_status enum...");
  try {
    await sql.unsafe(`
      DO $$ BEGIN
        CREATE TYPE withdrawal_status AS ENUM('pending', 'approved', 'rejected', 'processing', 'completed', 'failed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✅ Enum created");
  } catch (error) {
    if (error.message.includes("already exists") || error.message.includes("duplicate")) {
      console.log("ℹ️  Enum already exists");
    } else {
      throw error;
    }
  }
  
  // 2. Add columns to orders table
  console.log("📦 Adding payment gateway fields to orders table...");
  try {
    await sql.unsafe(`
      ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS gateway varchar(50),
        ADD COLUMN IF NOT EXISTS gateway_reference varchar(255),
        ADD COLUMN IF NOT EXISTS gateway_payment_id varchar(255);
    `);
    console.log("✅ Orders table updated");
  } catch (error) {
    console.error("❌ Error updating orders:", error.message);
    throw error;
  }
  
  // 3. Create withdrawal_requests table
  console.log("📦 Creating withdrawal_requests table...");
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id serial PRIMARY KEY,
        advisor_id integer NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
        amount_kwd integer NOT NULL,
        status withdrawal_status NOT NULL DEFAULT 'pending',
        bank_details json,
        notes text,
        approved_by integer REFERENCES users(id) ON DELETE SET NULL,
        approved_at timestamp,
        rejected_at timestamp,
        rejection_reason text,
        completed_at timestamp,
        gateway_reference varchar(255),
        created_at timestamp DEFAULT now() NOT NULL,
        updated_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("✅ withdrawal_requests table created");
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log("ℹ️  Table already exists");
    } else {
      console.error("❌ Error creating table:", error.message);
      throw error;
    }
  }
  
  // 4. Create password_reset_tokens table
  console.log("📦 Creating password_reset_tokens table...");
  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id serial PRIMARY KEY,
        user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(255) NOT NULL,
        expires_at timestamp NOT NULL,
        used_at timestamp,
        created_at timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log("✅ password_reset_tokens table created");
  } catch (error) {
    if (error.message.includes("already exists")) {
      console.log("ℹ️  Table already exists");
    } else {
      console.error("❌ Error creating table:", error.message);
      throw error;
    }
  }
  
  // 5. Create indexes
  console.log("📦 Creating indexes...");
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);",
    "CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);",
    "CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_advisor_id ON withdrawal_requests(advisor_id);",
    "CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);"
  ];
  
  for (const indexSql of indexes) {
    try {
      await sql.unsafe(indexSql);
      console.log("✅ Index created");
    } catch (error) {
      if (error.message.includes("already exists")) {
        console.log("ℹ️  Index already exists");
      } else {
        console.error("❌ Error creating index:", error.message);
        throw error;
      }
    }
  }
  
  console.log("✅ Migration completed successfully!");
  await sql.end();
  process.exit(0);
} catch (error) {
  console.error("❌ Migration failed:", error.message);
  await sql.end();
  process.exit(1);
}

