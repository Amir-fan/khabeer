/**
 * Manual news sync script
 * Run with: npx tsx scripts/sync-news.ts
 */
// Load environment variables first
import "../scripts/load-env.js";
import { syncAllNews } from "../server/_core/newsSync.js";

async function main() {
  console.log("🔄 Starting news sync...\n");
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is not set!");
    console.error("   Please set it in your .env file or environment variables.");
    process.exit(1);
  }
  
  try {
    const result = await syncAllNews();
    
    console.log("\n✅ Sync completed!");
    console.log(`📰 NewsAPI: ${result.api.added} added, ${result.api.skipped} skipped`);
    console.log(`📜 AAOIFI: ${result.aaoifi.added} added, ${result.aaoifi.skipped} skipped`);
    console.log(`\n📊 Total: ${result.api.added + result.aaoifi.added} new articles`);
    
    // Close database connection
    const { getPostgresClient } = await import("../server/db.js");
    const client = getPostgresClient();
    if (client) {
      await client.end();
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
}

main();
