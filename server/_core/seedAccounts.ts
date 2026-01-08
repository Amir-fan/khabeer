import bcrypt from "bcrypt";
import { getDb, getUserByEmail } from "../db";
import { users, vendors } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

type SeedUser = {
  email: string;
  name: string;
  password: string;
  role: "admin" | "user";
  tier?: "free" | "pro";
};

type SeedVendor = {
  email: string;
  name: string;
  password: string;
};

// Get seed account credentials from environment variables
// If not set, seeding will be skipped (safe for production)
const getAdminAccount = (): SeedUser | null => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Admin";
  
  if (!email || !password) {
    return null;
  }
  
  return {
    email,
    name,
    password,
    role: "admin",
    tier: "pro",
  };
};

const getPartnerAccount = (): SeedVendor | null => {
  const email = process.env.SEED_PARTNER_EMAIL;
  const password = process.env.SEED_PARTNER_PASSWORD;
  const name = process.env.SEED_PARTNER_NAME || "Partner";
  
  if (!email || !password) {
    return null;
  }
  
  return {
    email,
    name,
    password,
  };
};

export async function seedAccounts() {
  const db = await getDb();
  if (!db) return;

  // Seed admin user (only if env vars are set)
  const adminAccount = getAdminAccount();
  if (adminAccount) {
    const existingAdmin = await getUserByEmail(adminAccount.email);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminAccount.password, 10);
      await db.insert(users).values({
        openId: `seed_admin_${Date.now()}`,
        name: adminAccount.name,
        email: adminAccount.email,
        password: passwordHash,
        role: adminAccount.role,
        tier: adminAccount.tier ?? "pro",
        status: "active",
        loginMethod: "seed",
      });
      console.log(`[Seed] Created admin account: ${adminAccount.email}`);
    } else {
      // Update password if it doesn't match (in case it was changed)
      const passwordHash = await bcrypt.hash(adminAccount.password, 10);
      await db.update(users)
        .set({ password: passwordHash })
        .where(eq(users.email, adminAccount.email));
      console.log(`[Seed] Updated admin account password: ${adminAccount.email}`);
    }
  } else {
    console.log("[Seed] Skipping admin account seeding (SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD not set)");
  }

  // Seed partner user (advisor role) - only if env vars are set
  const partnerAccount = getPartnerAccount();
  if (partnerAccount) {
    const existingPartner = await getUserByEmail(partnerAccount.email);
    if (!existingPartner) {
      const passwordHash = await bcrypt.hash(partnerAccount.password, 10);
      await db.insert(users).values({
        openId: `seed_partner_${Date.now()}`,
        name: partnerAccount.name,
        email: partnerAccount.email,
        password: passwordHash,
        role: "advisor", // Partner/advisor role
        tier: "pro",
        status: "active",
        loginMethod: "seed",
      });
      console.log(`[Seed] Created partner account: ${partnerAccount.email}`);
    } else {
      // Update password if it doesn't match
      const passwordHash = await bcrypt.hash(partnerAccount.password, 10);
      await db.update(users)
        .set({ password: passwordHash })
        .where(eq(users.email, partnerAccount.email));
      console.log(`[Seed] Updated partner account password: ${partnerAccount.email}`);
    }

    // Also seed partner vendor (for vendor-specific features)
    const existingVendor = await db.select().from(vendors).where(eq(vendors.email, partnerAccount.email)).limit(1);
    if (existingVendor.length === 0) {
      const passwordHash = await bcrypt.hash(partnerAccount.password, 10);
      await db.insert(vendors).values({
        name: partnerAccount.name,
        email: partnerAccount.email,
        status: "approved",
        isAvailable: true,
        passwordHash,
        commissionRate: 30,
        rating: 0,
        totalOrders: 0,
      });
      console.log(`[Seed] Created partner vendor record: ${partnerAccount.email}`);
    }
  } else {
    console.log("[Seed] Skipping partner account seeding (SEED_PARTNER_EMAIL/SEED_PARTNER_PASSWORD not set)");
  }
}

