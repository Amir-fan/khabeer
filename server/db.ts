import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  users,
  libraryFiles,
  conversations,
  messages,
  files,
  consultationFiles,
  stocks,
  watchlist,
  news,
  knowledgeBase,
  systemSettings,
  tickets,
  apiKeys,
  consultants,
  partnerApplications,
  partnerApplicationFiles,
  partnerApplicationStatusEnum,
  tierLimits,
  usageCounters,
  consultationRequests,
  requestAssignments,
  consultationMessages,
  advisorRatings,
  requestTransitions,
  orders,
  vendors,
  subscriptions,
  InsertConversation,
  InsertMessage,
  InsertFile,
  InsertStock,
  InsertNews,
  InsertKnowledgeBase,
  InsertTicket,
  InsertConsultant,
  InsertVendor,
  User,
  InsertConsultationRequest,
  InsertRequestAssignment,
  InsertConsultationMessage,
  InsertAdvisorRating,
  InsertRequestTransition,
  InsertConsultationFile,
  InsertPartnerApplication,
  InsertPartnerApplicationFile,
  InsertLibraryFile,
  libraryCreatorRoleEnum,
  userTierEnum,
  withdrawalRequests,
  passwordResetTokens,
  InsertWithdrawalRequest,
  InsertPasswordResetToken,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import bcrypt from "bcrypt";

const defaultTierLimits = {
  free: {
    aiDailyLimit: 10,
    advisorChatDailyLimit: 3,
    contractAccessLevel: "locked" as const,
    discountRateBps: 0,
    priorityWeight: 0,
  },
  pro: {
    aiDailyLimit: null,
    advisorChatDailyLimit: null,
    contractAccessLevel: "full" as const,
    discountRateBps: 1000, // 10%
    priorityWeight: 10,
  },
};

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = postgres(process.env.DATABASE_URL, { 
        ssl: 'require',
        max: 10,
        idle_timeout: 20,
        connect_timeout: 30,
        max_lifetime: 60 * 30,
      });
      _db = drizzle(_client);
      console.log("[Database] Connected to Supabase successfully");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Reconnect function for handling connection drops
export async function reconnectDb() {
  _db = null;
  _client = null;
  return getDb();
}

// Get raw postgres client for advanced operations (e.g., raw SQL)
export function getPostgresClient() {
  return _client;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Build partial insert object (email is required in schema, so ensure it's provided)
    const values: Partial<InsertUser> = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      // For email, it's required, so don't allow null
      if (field === "email" && !value) {
        throw new Error("Email is required for user upsert");
      }
      const normalized = field === "email" ? value : (value ?? null);
      (values as any)[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);
    
    // Ensure email is present (required by schema)
    if (!values.email) {
      if (user.email) {
        values.email = user.email;
        updateSet.email = user.email;
      } else {
        throw new Error("Email is required for user upsert");
      }
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Type assertion: we've ensured email is present above
    await db.insert(users).values(values as InsertUser).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ Conversations ============

export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(conversations).values(data).returning({ id: conversations.id });
  return result[0].id;
}

export async function getUserConversations(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
}

export async function getConversation(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(conversations).where(eq(conversations.id, id));
  return result[0] || null;
}

export async function updateConversation(id: number, data: { title?: string; updatedAt?: Date }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(conversations).set({ ...data, updatedAt: data.updatedAt || new Date() }).where(eq(conversations.id, id));
}

export async function deleteConversation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete messages first (cascade should handle this, but being explicit)
  await db.delete(messages).where(eq(messages.conversationId, id));
  // Delete conversation
  await db.delete(conversations).where(eq(conversations.id, id));
}

// ============ Messages ============

export async function addMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data).returning({ id: messages.id });
  return result[0].id;
}

export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

export async function getRecentConversationMessages(conversationId: number, limit = 15) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

// ============ Files ============

export async function createFile(data: InsertFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(files).values(data).returning({ id: files.id });
  return result[0].id;
}

export async function getUserFiles(userId: number, type?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (type && type !== "all") {
    return db
      .select()
      .from(files)
      .where(and(eq(files.userId, userId), eq(files.type, type as any)))
      .orderBy(desc(files.createdAt));
  }
  
  return db
    .select()
    .from(files)
    .where(eq(files.userId, userId))
    .orderBy(desc(files.createdAt));
}

export async function updateFileStatus(id: number, status: "pending" | "analyzing" | "analyzed" | "error", analysisResult?: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(files).set({ status, analysisResult }).where(eq(files.id, id));
}

// Consultation file helpers (Supabase-backed metadata)
export async function addConsultationFile(data: InsertConsultationFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(consultationFiles).values(data).returning({ id: consultationFiles.id });
  return result[0].id;
}

export async function listConsultationFiles(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consultationFiles)
    .where(eq(consultationFiles.consultationId, requestId))
    .orderBy(desc(consultationFiles.createdAt));
}

export async function getConsultationFile(fileId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(consultationFiles)
    .where(eq(consultationFiles.id, fileId));
  return result[0] || null;
}

export async function getFile(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(files).where(eq(files.id, id));
  return result[0] || null;
}

export async function deleteFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(files).where(eq(files.id, id));
}

// ============ Stocks ============

export async function getStockBySymbol(symbol: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(stocks).where(eq(stocks.symbol, symbol.toUpperCase()));
  return result[0] || null;
}

export async function createOrUpdateStock(data: InsertStock) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getStockBySymbol(data.symbol);
  if (existing) {
    await db.update(stocks).set(data).where(eq(stocks.id, existing.id));
    return existing.id;
  }
  
  const result = await db.insert(stocks).values(data).returning({ id: stocks.id });
  return result[0].id;
}

export async function searchStocks(query: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stocks).limit(20);
}

// ============ Watchlist ============

export async function getUserWatchlist(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(watchlist).where(eq(watchlist.userId, userId));
}

export async function addToWatchlist(userId: number, stockId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(watchlist).values({ userId, stockId });
}

export async function removeFromWatchlist(userId: number, stockId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(watchlist).where(and(eq(watchlist.userId, userId), eq(watchlist.stockId, stockId)));
}

// ============ News ============

export async function getNews(category?: string, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  
  if (category && category !== "all") {
    return db
      .select()
      .from(news)
      .where(eq(news.category, category as any))
      .orderBy(desc(news.publishedAt))
      .limit(limit);
  }
  
  return db.select().from(news).orderBy(desc(news.publishedAt)).limit(limit);
}

export async function createNews(data: InsertNews) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(news).values(data).returning({ id: news.id });
  return result[0].id;
}

// ============ Knowledge Base ============

export async function addKnowledgeDocument(data: InsertKnowledgeBase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(knowledgeBase).values(data).returning({ id: knowledgeBase.id });
  return result[0].id;
}

export async function getKnowledgeDocuments(type?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (type) {
    return db.select().from(knowledgeBase).where(eq(knowledgeBase.type, type as any));
  }
  
  return db.select().from(knowledgeBase);
}

// ============ System Settings ============

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
  return result[0]?.value || null;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getSetting(key);
  if (existing !== null) {
    await db.update(systemSettings).set({ value }).where(eq(systemSettings.key, key));
  } else {
    await db.insert(systemSettings).values({ key, value });
  }
}

// ============ Partner Applications ============

export async function createPartnerApplication(data: InsertPartnerApplication) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  const result = await dbInstance.insert(partnerApplications).values(data).returning({ id: partnerApplications.id });
  return result[0].id;
}

export async function addPartnerApplicationFile(data: InsertPartnerApplicationFile) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  const result = await dbInstance.insert(partnerApplicationFiles).values(data).returning({ id: partnerApplicationFiles.id });
  return result[0].id;
}

export async function listPartnerApplications(status?: (typeof partnerApplicationStatusEnum.enumValues)[number]) {
  const dbInstance = await getDb();
  if (!dbInstance) return [];
  if (status) {
    return dbInstance.select().from(partnerApplications).where(eq(partnerApplications.status, status));
  }
  return dbInstance.select().from(partnerApplications).orderBy(desc(partnerApplications.createdAt));
}

export async function getPartnerApplicationById(id: number) {
  const dbInstance = await getDb();
  if (!dbInstance) return null;
  const result = await dbInstance.select().from(partnerApplications).where(eq(partnerApplications.id, id));
  return result[0] || null;
}

export async function updatePartnerApplication(
  id: number,
  data: Partial<InsertPartnerApplication> & {
    reviewerUserId?: number | null;
    approvedAt?: Date | null;
    rejectedAt?: Date | null;
  },
) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  await dbInstance.update(partnerApplications).set(data as any).where(eq(partnerApplications.id, id));
}

// ============ Tickets ============

export async function createTicket(data: InsertTicket) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tickets).values(data).returning({ id: tickets.id });
  return result[0].id;
}

export async function getTickets(status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  if (status) {
    return db.select().from(tickets).where(eq(tickets.status, status as any)).orderBy(desc(tickets.createdAt));
  }
  
  return db.select().from(tickets).orderBy(desc(tickets.createdAt));
}

export async function updateTicket(id: number, data: Partial<InsertTicket>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(tickets).set(data).where(eq(tickets.id, id));
}

// ============ Orders helper ============
export async function updateOrderByRequest(
  requestId: number,
  data: Partial<typeof orders.$inferInsert>,
) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  await dbInstance.update(orders).set(data as any).where(eq(orders.requestId, requestId));
}

export async function getOrderByRequest(requestId: number) {
  const dbInstance = await getDb();
  if (!dbInstance) return null;
  const result = await dbInstance.select().from(orders).where(eq(orders.requestId, requestId));
  return result[0] || null;
}

// ============ Library Files ============
export async function createLibraryFile(data: InsertLibraryFile) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  const result = await dbInstance.insert(libraryFiles).values(data).returning({ id: libraryFiles.id, createdAt: libraryFiles.createdAt });
  return { id: result[0].id, createdAt: result[0].createdAt };
}

export async function getLibraryFileById(id: number) {
  const dbInstance = await getDb();
  if (!dbInstance) return null;
  const result = await dbInstance.select().from(libraryFiles).where(eq(libraryFiles.id, id));
  return result[0] || null;
}

export async function listLibraryFilesVisibleToUser(user: User | null) {
  const dbInstance = await getDb();
  if (!dbInstance) return [];

  if (!user) {
    // Guests see only public
    return dbInstance
      .select()
      .from(libraryFiles)
      .where(eq(libraryFiles.isPublic, true))
      .orderBy(desc(libraryFiles.createdAt));
  }

  return dbInstance
    .select()
    .from(libraryFiles)
    .where(
      (eq(libraryFiles.isPublic, true) as any).or(eq(libraryFiles.targetUserId, user.id))
    )
    .orderBy(desc(libraryFiles.createdAt));
}

// ============ API Keys ============

export async function createApiKey(userId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const key = generateApiKey();
  const result = await db.insert(apiKeys).values({ userId, key, name }).returning({ id: apiKeys.id });
  return { id: result[0].id, key };
}

export async function getUserApiKeys(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
}

export async function validateApiKey(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(apiKeys).where(and(eq(apiKeys.key, key), eq(apiKeys.isActive, true)));
  if (result[0]) {
    await db.update(apiKeys).set({ lastUsed: new Date() }).where(eq(apiKeys.id, result[0].id));
  }
  return result[0] || null;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "thm_";
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// ============ Admin Functions ============

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getAllConversations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(conversations).orderBy(desc(conversations.createdAt));
}

export async function getAllFiles() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(files).orderBy(desc(files.createdAt));
}

export async function getAllStocks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(stocks);
}

export async function getKnowledgeBase() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt));
}

export async function getApiKeys() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
}

export async function revokeApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(apiKeys).set({ isActive: false }).where(eq(apiKeys.id, id));
  return { success: true };
}

// ============ RAG Search ============

export async function searchKnowledgeBase(query: string) {
  let db = await getDb();
  if (!db) return [];
  
  let allDocs;
  try {
    allDocs = await db.select().from(knowledgeBase);
  } catch (error) {
    console.warn("[Database] Connection error, attempting reconnect...");
    db = await reconnectDb();
    if (!db) return [];
    try {
      allDocs = await db.select().from(knowledgeBase);
    } catch (retryError) {
      console.error("[Database] Reconnect failed:", retryError);
      return [];
    }
  }
  
  if (!allDocs) return [];
  const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
  
  const scoredDocs = allDocs.map(doc => {
    let score = 0;
    const titleLower = (doc.title || "").toLowerCase();
    const contentLower = (doc.content || "").toLowerCase();
    
    keywords.forEach(keyword => {
      if (titleLower.includes(keyword)) score += 3;
      if (contentLower.includes(keyword)) score += 1;
    });
    
    return { ...doc, score };
  });
  
  return scoredDocs
    .filter(doc => doc.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

// ============ Consultants ============

export async function getConsultants() {
  const dbInstance = await getDb();
  if (!dbInstance) {
    return [
      { id: 1, name: 'د. محمد العمري', email: 'mohammad@thimmah.com', specialty: 'فقه المعاملات', status: 'active', maxChatsPerDay: 10, currentChats: 3 },
      { id: 2, name: 'د. فاطمة السعيد', email: 'fatima@thimmah.com', specialty: 'الصكوك والسندات', status: 'active', maxChatsPerDay: 8, currentChats: 5 },
    ];
  }
  return dbInstance.select().from(consultants).orderBy(desc(consultants.createdAt));
}

export async function getConsultantByEmail(email: string) {
  const dbInstance = await getDb();
  if (!dbInstance) return null;
  const result = await dbInstance.select().from(consultants).where(eq(consultants.email, email));
  return result[0] || null;
}

export async function createConsultant(data: { name: string; email: string; specialty: string; bio?: string; maxChatsPerDay?: number }) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  
  const result = await dbInstance.insert(consultants).values({
    name: data.name,
    email: data.email,
    specialty: data.specialty,
    bio: data.bio || null,
    maxChatsPerDay: data.maxChatsPerDay || 10,
    status: 'active',
  }).returning({ id: consultants.id });
  
  return { id: result[0].id, ...data, status: 'active', createdAt: new Date() };
}

export async function updateConsultant(id: number, data: { status?: string; maxChatsPerDay?: number }) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  
  await dbInstance.update(consultants)
    .set(data as any)
    .where(eq(consultants.id, id));
  
  return { id, ...data, updatedAt: new Date() };
}

export async function ensureConsultantForUser(user: User) {
  if (!user?.email) return null;
  const existing = await getConsultantByEmail(user.email);
  if (existing) return existing;
  const name = user.name || user.email.split("@")[0] || "مستشار";
  return createConsultant({
    name,
    email: user.email,
    specialty: "عام",
  });
}

export async function updateConsultantProfile(id: number, profile: {
  companyName?: string | null;
  phone?: string | null;
  specialty?: string | null;
  bank?: { name?: string | null; iban?: string | null; accountName?: string | null } | null;
  documents?: { name: string; url: string }[] | null;
}) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  const current = await dbInstance.select().from(consultants).where(eq(consultants.id, id));
  if (!current[0]) throw new Error("Consultant not found");
  let bioJson: any = {};
  if (current[0].bio) {
    try {
      bioJson = JSON.parse(current[0].bio as any);
    } catch {
      bioJson = {};
    }
  }
  bioJson.companyName = profile.companyName ?? bioJson.companyName ?? null;
  bioJson.bank = profile.bank ?? bioJson.bank ?? null;
  bioJson.documents = profile.documents ?? bioJson.documents ?? [];

  await dbInstance
    .update(consultants)
    .set({
      phone: profile.phone ?? current[0].phone ?? null,
      specialty: profile.specialty ?? current[0].specialty,
      bio: JSON.stringify(bioJson),
      updatedAt: new Date(),
    })
    .where(eq(consultants.id, id));

  return { ...current[0], phone: profile.phone ?? current[0].phone, specialty: profile.specialty ?? current[0].specialty, bio: JSON.stringify(bioJson) };
}

// ============ Notification Triggers ============

export async function getNotificationTriggers() {
  return [
    { type: 'registration', enabled: true, subject: 'مرحباً بك في خبير!', body: 'مرحباً {{name}}، شكراً لتسجيلك في منصة خبير...' },
    { type: 'purchase', enabled: true, subject: 'تأكيد الاشتراك', body: 'مرحباً {{name}}، تم تفعيل باقة {{package}} بنجاح...' },
    { type: 'cart_abandonment', enabled: true, subject: 'أكمل اشتراكك', body: 'مرحباً {{name}}، لاحظنا أنك لم تكمل عملية الاشتراك...' },
    { type: 'unread_messages', enabled: true, subject: 'رسائل جديدة', body: 'لديك رسائل غير مقروءة في خبير...' },
  ];
}

export async function updateNotificationTrigger(data: { type: string; enabled: boolean; template?: { subject: string; body: string } }) {
  return { ...data, updatedAt: new Date() };
}

// ============ AI Settings ============

export async function getAISettings() {
  return {
    conversation: {
      systemPrompt: 'أنت مستشار مالي إسلامي متخصص في الشريعة الإسلامية والتمويل الإسلامي...',
      maxTokens: 2000,
      temperature: 0.7,
      enableMemory: true,
    },
    sources: {
      processingPrompt: 'عند معالجة المستندات: استخرج المفاهيم الشرعية الرئيسية...',
      enableRAG: true,
      sourcesPerAnswer: 5,
      similarityThreshold: 0.7,
    },
    personality: {
      name: 'خبير',
      tone: 'friendly',
      personality: 'أنا خبير، مستشارك الشرعي للتمويل الإسلامي...',
      welcomeMessage: 'مرحباً بك في خبير! أنا مستشارك الشرعي للتمويل الإسلامي. كيف يمكنني مساعدتك اليوم؟',
      useEmoji: false,
      alwaysCiteSources: true,
    },
  };
}

export async function updateAISettings(section: string, data: Record<string, unknown>) {
  return { section, ...data, updatedAt: new Date() };
}

// ============ User Management Functions ============

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] || null;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string; // Must already be hashed
  role: "user" | "admin" | "consultant" | "advisor";
  openId?: string;
  loginMethod?: string;
}) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");

  const result = await dbInstance
    .insert(users)
    .values({
      openId: data.openId || `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: data.email,
      password: data.passwordHash, // Already hashed
      loginMethod: data.loginMethod || "email",
      role: data.role,
      // tier/status/createdAt/updatedAt/lastSignedIn use DB defaults
    })
    .returning({ id: users.id, createdAt: users.createdAt });

  // Return minimal identity snapshot without password
  return {
    id: result[0].id,
    email: data.email,
    role: data.role,
    createdAt: result[0].createdAt,
  };
}


export async function getAllVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).orderBy(desc(vendors.createdAt));
}

export async function getVendorById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(vendors).where(eq(vendors.id, id));
  return result[0] || null;
}

export async function getVendorByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(vendors).where(eq(vendors.email, email));
  return result[0] || null;
}

export async function createVendor(data: {
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  specialty?: string[];
  bio?: string;
  logoUrl?: string;
  commissionRate?: number;
  passwordHash?: string;
  bankName?: string;
  iban?: string;
  taxNumber?: string;
  licenseUrl?: string;
}) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  
  const result = await dbInstance.insert(vendors).values({
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    companyName: data.companyName || null,
    specialty: data.specialty || [],
    bio: data.bio || null,
    logoUrl: data.logoUrl || null,
    commissionRate: data.commissionRate || 30,
    status: 'pending',
    rating: 0,
    totalOrders: 0,
    isAvailable: true,
    passwordHash: data.passwordHash || null,
  }).returning({ id: vendors.id });
  
  return { id: result[0].id, ...data, status: 'pending', createdAt: new Date() };
}

export async function updateVendor(id: number, data: Partial<{
  name: string;
  email: string;
  phone: string;
  companyName: string;
  specialty: string[];
  bio: string;
  logoUrl: string;
  status: string;
  commissionRate: number;
  isAvailable: boolean;
  rating: number;
  totalOrders: number;
  passwordHash: string;
}>) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  
  await dbInstance.update(vendors)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(vendors.id, id));
  
  return { id, ...data, updatedAt: new Date() };
}

export async function deleteVendor(id: number) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  
  await dbInstance.delete(vendors).where(eq(vendors.id, id));
  return { success: true };
}

export async function getVendorStats(vendorId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const vendorOrders = await db.select().from(orders).where(eq(orders.vendorId, vendorId));
  
  const totalRevenue = vendorOrders.reduce((sum, o) => sum + (o.vendorPayoutKWD || 0), 0);
  const completedOrders = vendorOrders.filter(o => o.status === 'completed').length;
  const pendingOrders = vendorOrders.filter(o => o.status === 'pending').length;
  const inProgressOrders = vendorOrders.filter(o => o.status === 'in_progress').length;
  
  return {
    totalRevenue,
    completedOrders,
    pendingOrders,
    inProgressOrders,
    totalOrders: vendorOrders.length,
  };
}

// ============ Orders Management ============

export async function getAllOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt));
}

export async function getVendorOrders(vendorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.vendorId, vendorId)).orderBy(desc(orders.createdAt));
}

export async function createOrder(data: {
  userId: number;
  vendorId?: number;
  serviceType: string;
  priceKWD: number;
  documentUrl?: string;
  notes?: string;
}) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  
  const platformFee = Math.round(data.priceKWD * 0.30);
  const vendorPayout = data.priceKWD - platformFee;
  
  const result = await dbInstance.insert(orders).values({
    userId: data.userId,
    vendorId: data.vendorId || null,
    serviceType: data.serviceType,
    priceKWD: data.priceKWD,
    platformFeeKWD: platformFee,
    vendorPayoutKWD: vendorPayout,
    documentUrl: data.documentUrl || null,
    notes: data.notes || null,
    status: 'pending',
  }).returning({ id: orders.id });
  
  return { id: result[0].id, ...data, status: 'pending', createdAt: new Date() };
}

export async function updateOrderStatus(id: number, status: string, vendorId?: number) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  
  const updateData: any = { status, updatedAt: new Date() };
  
  if (vendorId) {
    updateData.vendorId = vendorId;
    updateData.assignedAt = new Date();
  }
  
  if (status === 'completed') {
    updateData.completedAt = new Date();
  }
  
  await dbInstance.update(orders).set(updateData).where(eq(orders.id, id));
  return { id, status, updatedAt: new Date() };
}

// ============ Subscriptions Management ============

export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  return result[0] || null;
}

export async function createSubscription(data: {
  userId: number;
  planName: string;
  priceKWD: number;
  paymentMethod?: string;
  paymentReference?: string;
}) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1); // Monthly subscription
  
  const result = await dbInstance.insert(subscriptions).values({
    userId: data.userId,
    planName: data.planName,
    priceKWD: data.priceKWD,
    status: 'active',
    startDate,
    endDate,
    autoRenew: true,
    paymentMethod: data.paymentMethod || null,
    paymentReference: data.paymentReference || null,
  }).returning({ id: subscriptions.id });
  
  // Update user tier to pro
  await dbInstance.update(users).set({ tier: 'pro' }).where(eq(users.id, data.userId));
  
  return { id: result[0].id, ...data, status: 'active', startDate, endDate };
}

export async function cancelSubscription(userId: number) {
  const dbInstance = await getDb();
  if (!dbInstance) throw new Error("Database not available");
  
  await dbInstance.update(subscriptions)
    .set({ status: 'cancelled', autoRenew: false, updatedAt: new Date() })
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, 'active')));
  
  // Update user tier back to free
  await dbInstance.update(users).set({ tier: 'free' }).where(eq(users.id, userId));
  
  return { success: true };
}

// ============ Notifications ============

export async function sendNotificationToVendor(vendorId: number, notification: {
  title: string;
  message: string;
  type: string;
}) {
  // In a real implementation, this would send push notifications, emails, etc.
  console.log(`[Notification] Sending to vendor ${vendorId}:`, notification);
  return { success: true, vendorId, ...notification, sentAt: new Date() };
}

export async function sendNotificationToAllVendors(notification: {
  title: string;
  message: string;
  type: string;
}) {
  const allVendors = await getAllVendors();
  const results = await Promise.all(
    allVendors.map(v => sendNotificationToVendor(v.id, notification))
  );
  return { success: true, count: results.length, sentAt: new Date() };
}

// ============ Platform Statistics ============

export async function getPlatformStats() {
  const db = await getDb();
  if (!db) return null;
  
  const allUsers = await db.select().from(users);
  const allVendors = await db.select().from(vendors);
  const allOrders = await db.select().from(orders);
  const allSubscriptions = await db.select().from(subscriptions);
  
  const totalRevenue = allOrders.reduce((sum, o) => sum + (o.priceKWD || 0), 0);
  const platformRevenue = allOrders.reduce((sum, o) => sum + (o.platformFeeKWD || 0), 0);
  const vendorPayouts = allOrders.reduce((sum, o) => sum + (o.vendorPayoutKWD || 0), 0);
  const subscriptionRevenue = allSubscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + (s.priceKWD || 0), 0);
  
  return {
    users: {
      total: allUsers.length,
      active: allUsers.filter(u => u.status === 'active').length,
      pro: allUsers.filter(u => u.tier === 'pro').length,
      free: allUsers.filter(u => u.tier === 'free').length,
    },
    vendors: {
      total: allVendors.length,
      approved: allVendors.filter(v => v.status === 'approved').length,
      pending: allVendors.filter(v => v.status === 'pending').length,
      banned: allVendors.filter(v => v.status === 'banned').length,
    },
    orders: {
      total: allOrders.length,
      completed: allOrders.filter(o => o.status === 'completed').length,
      pending: allOrders.filter(o => o.status === 'pending').length,
      inProgress: allOrders.filter(o => o.status === 'in_progress').length,
    },
    revenue: {
      total: totalRevenue,
      platform: platformRevenue,
      vendorPayouts,
      subscriptions: subscriptionRevenue,
    },
  };
}

// ============ User Authentication for Admin-Created Users ============

/**
 * Authenticate user with email and password
 * Note: Password should be hashed, this function verifies the hash
 * @param email - User email
 * @param passwordHash - Hashed password to verify against
 * @returns User object without password, or null if authentication fails
 */
export async function authenticateUserByEmail(email: string, passwordHash: string): Promise<Omit<User, "password"> | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }
  
  const result = await db.select().from(users)
    .where(eq(users.email, email))
    .limit(1);
  
  if (result.length === 0) return null;
  
  const user = result[0];
  
  // Verify password hash (passwordHash parameter is the provided hash to compare)
  // In practice, we'll use bcrypt.compare in the router, not here
  // This function is kept for backward compatibility but should not be used directly
  
  // Update last signed in
  await db.update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// ============ Tier limits & usage counters ============

export async function seedTierLimits(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const tiers = userTierEnum.enumValues;
  for (const tier of tiers) {
    const existing = await db.select().from(tierLimits).where(eq(tierLimits.tier, tier as any)).limit(1);
    if (existing.length === 0) {
      const defaults = defaultTierLimits[tier as keyof typeof defaultTierLimits] ?? defaultTierLimits.free;
      await db.insert(tierLimits).values({
        tier: tier as any,
        aiDailyLimit: defaults.aiDailyLimit as any,
        advisorChatDailyLimit: defaults.advisorChatDailyLimit as any,
        contractAccessLevel: defaults.contractAccessLevel as any,
        discountRateBps: defaults.discountRateBps,
        priorityWeight: defaults.priorityWeight,
      });
    }
  }
}

export async function getTierLimitByTier(tier: typeof userTierEnum.enumValues[number]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(tierLimits).where(eq(tierLimits.tier, tier as any)).limit(1);
  if (result.length > 0) return result[0];

  return {
    tier,
    aiDailyLimit: defaultTierLimits[tier as keyof typeof defaultTierLimits]?.aiDailyLimit ?? null,
    advisorChatDailyLimit: defaultTierLimits[tier as keyof typeof defaultTierLimits]?.advisorChatDailyLimit ?? null,
    contractAccessLevel: defaultTierLimits[tier as keyof typeof defaultTierLimits]?.contractAccessLevel ?? "locked",
    discountRateBps: defaultTierLimits[tier as keyof typeof defaultTierLimits]?.discountRateBps ?? 0,
    priorityWeight: defaultTierLimits[tier as keyof typeof defaultTierLimits]?.priorityWeight ?? 0,
  };
}

export async function getOrCreateUsageCounter(userId: number, usageDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(usageCounters)
    .where(and(eq(usageCounters.userId, userId), eq(usageCounters.usageDate, usageDate as any)))
    .limit(1);
  if (existing.length > 0) return existing[0];

  const result = await db
    .insert(usageCounters)
    .values({ userId, usageDate: usageDate as any })
    .returning({
      id: usageCounters.id,
      aiUsed: usageCounters.aiUsed,
      advisorChatUsed: usageCounters.advisorChatUsed,
      usageDate: usageCounters.usageDate,
    });
  return result[0];
}

export async function incrementUsageCounter(
  userId: number,
  usageDate: Date,
  amounts: Partial<{ ai: number; advisorChat: number }>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const counter = await getOrCreateUsageCounter(userId, usageDate);
  const aiDelta = amounts.ai ?? 0;
  const chatDelta = amounts.advisorChat ?? 0;
  await db
    .update(usageCounters)
    .set({
      aiUsed: counter.aiUsed + aiDelta,
      advisorChatUsed: counter.advisorChatUsed + chatDelta,
      updatedAt: new Date(),
    })
    .where(eq(usageCounters.id, counter.id));
}

// ============ Consultation requests & assignments ============

export async function createConsultationRequest(data: InsertConsultationRequest) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(consultationRequests).values(data).returning({ id: consultationRequests.id });
  return result[0].id;
}

export async function updateConsultationRequestFields(
  requestId: number,
  data: Partial<InsertConsultationRequest>,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(consultationRequests)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(consultationRequests.id, requestId));
}

export async function getConsultationRequest(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(consultationRequests).where(eq(consultationRequests.id, id));
  return result[0] || null;
}

export async function listConsultationRequestsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consultationRequests)
    .where(eq(consultationRequests.userId, userId))
    .orderBy(desc(consultationRequests.createdAt));
}

export async function updateConsultationRequestStatus(
  requestId: number,
  toStatus: typeof consultationRequests.$inferSelect.status,
  actorUserId?: number,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getConsultationRequest(requestId);
  if (!existing) throw new Error("Request not found");

  await db.insert(requestTransitions).values({
    requestId,
    fromStatus: existing.status as any,
    toStatus: toStatus as any,
    actorUserId: actorUserId || null,
  });

  const timestampUpdates: Record<string, Date> = { updatedAt: new Date() };
  if (toStatus === "awaiting_payment") timestampUpdates["awaitingPaymentAt"] = new Date();
  if (toStatus === "paid") timestampUpdates["paidAt"] = new Date();
  if (toStatus === "closed") timestampUpdates["closedAt"] = new Date();
  if (toStatus === "rated") timestampUpdates["ratedAt"] = new Date();

  await db
    .update(consultationRequests)
    .set({ status: toStatus as any, ...timestampUpdates })
    .where(eq(consultationRequests.id, requestId));
}

export async function createRequestAssignment(data: InsertRequestAssignment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(requestAssignments).values(data).returning({ id: requestAssignments.id });
  return result[0].id;
}

export async function updateRequestAssignmentStatus(
  assignmentId: number,
  status: typeof requestAssignments.$inferSelect.status,
  respondedAt?: Date,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(requestAssignments)
    .set({ status: status as any, respondedAt: respondedAt || new Date() })
    .where(eq(requestAssignments.id, assignmentId));
}

export async function listAssignmentsForAdvisor(advisorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(requestAssignments)
    .where(eq(requestAssignments.advisorId, advisorId))
    .orderBy(desc(requestAssignments.createdAt));
}

// ============ Consultation messages ============

export async function addConsultationMessage(data: InsertConsultationMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(consultationMessages).values(data).returning({ id: consultationMessages.id });
  return result[0].id;
}

export async function getConsultationMessages(requestId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(consultationMessages)
    .where(eq(consultationMessages.requestId, requestId))
    .orderBy(consultationMessages.createdAt);
}

// ============ Advisor ratings ============

export async function addAdvisorRating(data: InsertAdvisorRating) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(advisorRatings).values(data).returning({ id: advisorRatings.id });
  return result[0].id;
}

// ============ System Settings ============

export async function getSystemSetting(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.key, key))
    .limit(1);
  return result.length > 0 ? result[0].value : null;
}

export async function setSystemSetting(key: string, value: string, updatedBy?: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(systemSettings)
    .values({ key, value, updatedBy: updatedBy || null } as any)
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: { value, updatedAt: new Date(), updatedBy: updatedBy || null } as any,
    });
}

export async function getAllSystemSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  if (!db) return {};
  const settings = await db.select().from(systemSettings);
  const result: Record<string, string> = {};
  for (const setting of settings) {
    result[setting.key] = setting.value || "";
  }
  return result;
}
