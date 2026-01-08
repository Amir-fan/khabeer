import "dotenv/config";
import postgres from "postgres";

console.log("🔍 Checking backend prerequisites...\n");

// Check environment variables
const required = ["DATABASE_URL", "JWT_SECRET", "GEMINI_API_KEY"];
const missing = [];

for (const key of required) {
  if (process.env[key]) {
    console.log(`✅ ${key}: Set`);
  } else {
    console.log(`❌ ${key}: Missing`);
    missing.push(key);
  }
}

if (missing.length > 0) {
  console.log(`\n⚠️  Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// Test database connection
console.log("\n🔍 Testing database connection...");
try {
  const sql = postgres(process.env.DATABASE_URL);
  await sql`SELECT 1 as test`;
  console.log("✅ Database connection: OK");
  await sql.end();
} catch (error) {
  console.log(`❌ Database connection failed: ${error.message}`);
  process.exit(1);
}

console.log("\n✅ All checks passed! Backend should start successfully.");
console.log("💡 If backend still won't start, check the terminal output for errors.");

