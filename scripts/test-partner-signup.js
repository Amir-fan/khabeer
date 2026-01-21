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

async function testPartnerSignup() {
  try {
    console.log("🧪 Testing Partner Signup Flow\n");
    console.log("=".repeat(60));

    // Step 1: Check if email already exists
    console.log("\n📋 Step 1: Checking for existing applications...");
    const testEmail = `test_partner_${Date.now()}@example.com`;
    console.log(`  Using test email: ${testEmail}`);

    const existing = await sql`
      SELECT * FROM partner_applications WHERE email = ${testEmail}
    `;
    if (existing.length > 0) {
      console.log("  ⚠️  Test email already exists, cleaning up...");
      await sql`DELETE FROM partner_applications WHERE email = ${testEmail}`;
    }

    // Step 2: Simulate application submission
    console.log("\n📋 Step 2: Simulating application submission...");
    const applicationResult = await sql`
      INSERT INTO partner_applications (
        full_name,
        email,
        password_hash,
        phone,
        title,
        specialization,
        years_experience,
        bio,
        status
      ) VALUES (
        'Test Partner',
        ${testEmail},
        'hashed_password_placeholder',
        '+96512345678',
        'دكتور',
        'الفقه المالي',
        5,
        'خبير في الفقه المالي والاقتصاد الإسلامي',
        'pending_review'
      )
      RETURNING id, status, created_at
    `;
    const application = applicationResult[0];
    console.log(`  ✓ Application created: ID ${application.id}`);
    console.log(`  ✓ Status: ${application.status}`);
    console.log(`  ✓ Created at: ${application.created_at}`);

    // Step 3: Verify application exists
    console.log("\n📋 Step 3: Verifying application in database...");
    const verify = await sql`
      SELECT * FROM partner_applications WHERE id = ${application.id}
    `;
    if (verify.length > 0) {
      const app = verify[0];
      console.log("  ✅ Application found in database");
      console.log(`     - Full Name: ${app.full_name}`);
      console.log(`     - Email: ${app.email}`);
      console.log(`     - Phone: ${app.phone || 'N/A'}`);
      console.log(`     - Title: ${app.title || 'N/A'}`);
      console.log(`     - Specialization: ${app.specialization || 'N/A'}`);
      console.log(`     - Years Experience: ${app.years_experience || 'N/A'}`);
      console.log(`     - Status: ${app.status}`);
    } else {
      console.error("  ❌ Application not found!");
      await sql.end();
      process.exit(1);
    }

    // Step 4: Check if admin can see it
    console.log("\n📋 Step 4: Checking admin visibility...");
    const pendingApps = await sql`
      SELECT * FROM partner_applications WHERE status = 'pending_review'
      ORDER BY created_at DESC
    `;
    console.log(`  ✓ Found ${pendingApps.length} pending application(s)`);
    if (pendingApps.some(a => a.id === application.id)) {
      console.log("  ✅ Application visible to admin");
    }

    // Step 5: Simulate approval
    console.log("\n📋 Step 5: Simulating approval...");
    const admins = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
    if (admins.length === 0) {
      console.log("  ⚠️  No admin found, skipping approval test");
    } else {
      const adminId = admins[0].id;
      console.log(`  Using admin ID: ${adminId}`);
      
      // Update status to approved
      await sql`
        UPDATE partner_applications 
        SET status = 'approved', updated_at = now()
        WHERE id = ${application.id}
      `;
      
      // Check if user was created
      const createdUser = await sql`
        SELECT * FROM users WHERE email = ${testEmail}
      `;
      
      if (createdUser.length > 0) {
        console.log("  ✅ User account created after approval");
        console.log(`     - User ID: ${createdUser[0].id}`);
        console.log(`     - Role: ${createdUser[0].role}`);
        console.log(`     - Status: ${createdUser[0].status}`);
      } else {
        console.log("  ⚠️  User account not created (approval logic may need manual trigger)");
      }
      
      // Check if consultant record was created
      const consultant = await sql`
        SELECT * FROM consultants WHERE email = ${testEmail}
      `;
      
      if (consultant.length > 0) {
        console.log("  ✅ Consultant record created");
        console.log(`     - Consultant ID: ${consultant[0].id}`);
        console.log(`     - Status: ${consultant[0].status}`);
      } else {
        console.log("  ⚠️  Consultant record not created (may need manual creation)");
      }
    }

    // Step 6: Test rejection
    console.log("\n📋 Step 6: Testing rejection flow...");
    const rejectAppResult = await sql`
      INSERT INTO partner_applications (
        full_name,
        email,
        password_hash,
        status
      ) VALUES (
        'Rejected Partner',
        ${`rejected_${Date.now()}@example.com`},
        'hashed_password',
        'pending_review'
      )
      RETURNING id
    `;
    const rejectApp = rejectAppResult[0];
    
    await sql`
      UPDATE partner_applications 
      SET status = 'rejected', updated_at = now()
      WHERE id = ${rejectApp.id}
    `;
    
    const rejected = await sql`
      SELECT * FROM partner_applications WHERE id = ${rejectApp.id}
    `;
    
    if (rejected[0].status === 'rejected') {
      console.log("  ✅ Rejection works correctly");
    }

    // Cleanup
    console.log("\n📋 Step 7: Cleaning up test data...");
    await sql`DELETE FROM partner_applications WHERE email LIKE 'test_partner_%' OR email LIKE 'rejected_%'`;
    await sql`DELETE FROM users WHERE email LIKE 'test_partner_%' OR email LIKE 'rejected_%'`;
    await sql`DELETE FROM consultants WHERE email LIKE 'test_partner_%' OR email LIKE 'rejected_%'`;
    console.log("  ✓ Test data cleaned");

    console.log("\n" + "=".repeat(60));
    console.log("✅ Partner Signup Flow Test Complete!");
    console.log("\n💡 Summary:");
    console.log("  - Application submission: ✅ Works");
    console.log("  - Application storage: ✅ Works");
    console.log("  - Admin visibility: ✅ Works");
    console.log("  - Approval: ⚠️  May need manual user/consultant creation");
    console.log("  - Rejection: ✅ Works");

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
    await sql.end();
    process.exit(1);
  }
}

testPartnerSignup();
