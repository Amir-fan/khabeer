import { integer, pgEnum, pgTable, text, timestamp, varchar, boolean, json, serial, date } from "drizzle-orm/pg-core";

// Enums for PostgreSQL
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "consultant", "advisor"]);
export const userTierEnum = pgEnum("user_tier", ["free", "pro", "enterprise"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended", "deleted"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const fileTypeEnum = pgEnum("file_type", ["contract", "report", "stock", "other"]);
export const fileStatusEnum = pgEnum("file_status", ["pending", "analyzing", "analyzed", "error"]);
export const complianceStatusEnum = pgEnum("compliance_status", ["halal", "haram", "doubtful"]);
export const newsCategoryEnum = pgEnum("news_category", ["stocks", "gold", "fatwas", "markets", "general"]);
export const knowledgeTypeEnum = pgEnum("knowledge_type", ["fatwa", "standard", "article", "scraped"]);
export const consultantStatusEnum = pgEnum("consultant_status", ["active", "inactive"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "assigned", "resolved", "closed"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high"]);
export const contractAccessLevelEnum = pgEnum("contract_access_level", ["locked", "partial", "full"]);
export const requestStatusEnum = pgEnum("request_status", [
  "draft",
  "submitted",
  "pending_advisor",
  "accepted",
  "payment_reserved",
  "in_progress",
  "completed",
  "released",
  "cancelled",
  "rejected",
  "awaiting_payment",
  "paid",
  "closed",
  "rated",
]);
export const requestAssignmentStatusEnum = pgEnum("request_assignment_status", ["offered", "accepted", "declined", "expired"]);
export const consultationMessageRoleEnum = pgEnum("consultation_message_role", ["user", "advisor", "system"]);
export const partnerApplicationStatusEnum = pgEnum("partner_application_status", ["pending_review", "approved", "rejected"]);
export const libraryCreatorRoleEnum = pgEnum("library_creator_role", ["admin", "advisor"]);

/**
 * Core user table backing auth flow.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  tier: userTierEnum("tier").default("free").notNull(),
  packageId: integer("package_id"),
  dailyQuestionsUsed: integer("daily_questions_used").default(0),
  lastQuestionDate: timestamp("last_question_date"),
  status: userStatusEnum("status").default("active").notNull(),
  language: varchar("language", { length: 5 }).default("ar"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tier limits configuration (per tier)
 */
export const tierLimits = pgTable("tier_limits", {
  id: serial("id").primaryKey(),
  tier: userTierEnum("tier").notNull().unique(),
  aiDailyLimit: integer("ai_daily_limit"), // null = unlimited
  advisorChatDailyLimit: integer("advisor_chat_daily_limit"), // null = unlimited
  contractAccessLevel: contractAccessLevelEnum("contract_access_level").default("locked").notNull(),
  discountRateBps: integer("discount_rate_bps").default(0).notNull(), // 1000 = 10%
  priorityWeight: integer("priority_weight").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TierLimit = typeof tierLimits.$inferSelect;
export type InsertTierLimit = typeof tierLimits.$inferInsert;

/**
 * Usage counters per user per day
 */
export const usageCounters = pgTable("usage_counters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  usageDate: date("usage_date").notNull(), // UTC date
  aiUsed: integer("ai_used").default(0).notNull(),
  advisorChatUsed: integer("advisor_chat_used").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UsageCounter = typeof usageCounters.$inferSelect;
export type InsertUsageCounter = typeof usageCounters.$inferInsert;

/**
 * Conversations table - stores chat sessions
 */
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  context: varchar("context", { length: 50 }).default("general"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table - stores individual chat messages
 */
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  sources: json("sources"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Files table - stores user uploaded files
 */
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  type: fileTypeEnum("type").default("other").notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  size: integer("size"),
  url: text("url"),
  status: fileStatusEnum("status").default("pending").notNull(),
  analysisResult: json("analysis_result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;

/**
 * Stocks table - stores stock screening results
 */
export const stocks = pgTable("stocks", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  exchange: varchar("exchange", { length: 50 }),
  complianceStatus: complianceStatusEnum("compliance_status").default("doubtful").notNull(),
  complianceScore: integer("compliance_score"),
  analysisData: json("analysis_data"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export type Stock = typeof stocks.$inferSelect;
export type InsertStock = typeof stocks.$inferInsert;

/**
 * User stock watchlist
 */
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stockId: integer("stock_id").notNull().references(() => stocks.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Watchlist = typeof watchlist.$inferSelect;
export type InsertWatchlist = typeof watchlist.$inferInsert;

/**
 * News articles
 */
export const news = pgTable("news", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  summary: text("summary"),
  content: text("content"),
  source: varchar("source", { length: 100 }),
  sourceUrl: text("source_url"),
  imageUrl: text("image_url"),
  category: newsCategoryEnum("category").default("general").notNull(),
  isHalal: boolean("is_halal"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type News = typeof news.$inferSelect;
export type InsertNews = typeof news.$inferInsert;

/**
 * Knowledge base documents for RAG
 */
export const knowledgeBase = pgTable("knowledge_base", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: knowledgeTypeEnum("type").default("article").notNull(),
  source: varchar("source", { length: 255 }),
  sourceUrl: text("source_url"),
  embedding: json("embedding"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;

/**
 * System settings for admin
 */
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * Consultants table
 */
export const consultants = pgTable("consultants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  specialty: varchar("specialty", { length: 255 }).notNull(), // legacy primary specialty
  specialties: json("specialties"), // array of strings
  languages: json("languages"), // array of strings
  geo: json("geo"), // {country, region, city}
  availability: json("availability"), // array of slots
  skills: json("skills"), // array of strings/tags
  experienceYears: integer("experience_years"),
  ratingAvg: integer("rating_avg").default(0), // scaled 0-500 (x100)
  ratingCount: integer("rating_count").default(0),
  bio: text("bio"),
  imageUrl: text("image_url"),
  status: consultantStatusEnum("status").default("active").notNull(),
  maxChatsPerDay: integer("max_chats_per_day").default(10),
  currentChats: integer("current_chats").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Consultant = typeof consultants.$inferSelect;
export type InsertConsultant = typeof consultants.$inferInsert;

/**
 * Consultation requests lifecycle (tiered matching)
 */
export const consultationRequests = pgTable("consultation_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  advisorId: integer("advisor_id").references(() => consultants.id, { onDelete: "set null" }),
  userTierSnapshot: userTierEnum("user_tier_snapshot").notNull().default("free"),
  status: requestStatusEnum("status").notNull().default("submitted"),
  priorityWeight: integer("priority_weight").notNull().default(0),
  discountRateBps: integer("discount_rate_bps").notNull().default(0),
  grossAmountKwd: integer("gross_amount_kwd"),
  discountAmountKwd: integer("discount_amount_kwd"),
  netAmountKwd: integer("net_amount_kwd"),
  currency: varchar("currency", { length: 10 }).default("KWD").notNull(),
  summary: text("summary"),
  files: json("files"), // array of {fileId, name}
  awaitingPaymentAt: timestamp("awaiting_payment_at"),
  paidAt: timestamp("paid_at"),
  closedAt: timestamp("closed_at"),
  ratedAt: timestamp("rated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ConsultationRequest = typeof consultationRequests.$inferSelect;
export type InsertConsultationRequest = typeof consultationRequests.$inferInsert;

/**
 * Request assignment queue (deterministic ranking)
 */
export const requestAssignments = pgTable("request_assignments", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => consultationRequests.id, { onDelete: "cascade" }),
  advisorId: integer("advisor_id").notNull().references(() => consultants.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  status: requestAssignmentStatusEnum("status").default("offered").notNull(),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RequestAssignment = typeof requestAssignments.$inferSelect;
export type InsertRequestAssignment = typeof requestAssignments.$inferInsert;

/**
 * Request state transitions (audit trail)
 */
export const requestTransitions = pgTable("request_transitions", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => consultationRequests.id, { onDelete: "cascade" }),
  fromStatus: requestStatusEnum("from_status"),
  toStatus: requestStatusEnum("to_status").notNull(),
  actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RequestTransition = typeof requestTransitions.$inferSelect;
export type InsertRequestTransition = typeof requestTransitions.$inferInsert;

/**
 * Consultation messages (user ↔ advisor)
 */
export const consultationMessages = pgTable("consultation_messages", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => consultationRequests.id, { onDelete: "cascade" }),
  senderRole: consultationMessageRoleEnum("sender_role").notNull(),
  senderUserId: integer("sender_user_id").references(() => users.id, { onDelete: "set null" }),
  senderAdvisorId: integer("sender_advisor_id").references(() => consultants.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  attachments: json("attachments"), // optional array of {id,path,name,type}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConsultationMessage = typeof consultationMessages.$inferSelect;
export type InsertConsultationMessage = typeof consultationMessages.$inferInsert;

/**
 * Consultation files (Supabase storage metadata)
 */
export const consultationFiles = pgTable("consultation_files", {
  id: serial("id").primaryKey(),
  consultationId: integer("consultation_id").notNull().references(() => consultationRequests.id, { onDelete: "cascade" }),
  uploaderUserId: integer("uploader_user_id").references(() => users.id, { onDelete: "set null" }),
  uploaderAdvisorId: integer("uploader_advisor_id").references(() => consultants.id, { onDelete: "set null" }),
  uploaderRole: consultationMessageRoleEnum("uploader_role").notNull(),
  fileType: varchar("file_type", { length: 20 }).notNull(), // pdf | image | doc | other
  storagePath: text("storage_path").notNull(),
  mimeType: varchar("mime_type", { length: 120 }),
  size: integer("size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ConsultationFile = typeof consultationFiles.$inferSelect;
export type InsertConsultationFile = typeof consultationFiles.$inferInsert;

// Partner applications
export const partnerApplications = pgTable("partner_applications", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  title: text("title"),
  specialization: text("specialization"),
  yearsExperience: integer("years_experience"),
  bio: text("bio"),
  status: partnerApplicationStatusEnum("status").notNull().default("pending_review"),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  advisorId: integer("advisor_id").references(() => consultants.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  reviewerUserId: integer("reviewer_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const partnerApplicationFiles = pgTable("partner_application_files", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull().references(() => partnerApplications.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: varchar("mime_type", { length: 150 }),
  size: integer("size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PartnerApplication = typeof partnerApplications.$inferSelect;
export type InsertPartnerApplication = typeof partnerApplications.$inferInsert;
export type PartnerApplicationFile = typeof partnerApplicationFiles.$inferSelect;
export type InsertPartnerApplicationFile = typeof partnerApplicationFiles.$inferInsert;

/**
 * Library files (admin public, advisor→user 1:1)
 */
export const libraryFiles = pgTable("library_files", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 150 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdByRole: libraryCreatorRoleEnum("created_by_role").notNull(),
  createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
  targetUserId: integer("target_user_id").references(() => users.id, { onDelete: "set null" }),
  consultationId: integer("consultation_id").references(() => consultationRequests.id, { onDelete: "set null" }),
  isPublic: boolean("is_public").notNull().default(false),
});

export type LibraryFile = typeof libraryFiles.$inferSelect;
export type InsertLibraryFile = typeof libraryFiles.$inferInsert;

/**
 * Advisor ratings (post-close)
 */
export const advisorRatings = pgTable("advisor_ratings", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull().references(() => consultationRequests.id, { onDelete: "cascade" }),
  advisorId: integer("advisor_id").notNull().references(() => consultants.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdvisorRating = typeof advisorRatings.$inferSelect;
export type InsertAdvisorRating = typeof advisorRatings.$inferInsert;

/**
 * Consultant tickets for escalated cases
 */
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  consultantId: integer("consultant_id").references(() => consultants.id, { onDelete: "set null" }),
  status: ticketStatusEnum("status").default("open").notNull(),
  priority: ticketPriorityEnum("priority").default("medium").notNull(),
  subject: varchar("subject", { length: 255 }),
  resolution: text("resolution"),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = typeof tickets.$inferInsert;

/**
 * API keys for enterprise users
 */
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;


// New Enums for Business Model
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled", "expired", "pending"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "assigned", "in_progress", "completed", "cancelled"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "approved", "rejected", "processing", "completed", "failed"]);
export const vendorStatusEnum = pgEnum("vendor_status", ["pending", "approved", "banned"]);

/**
 * Subscriptions table - Tier B (Pro) subscriptions
 */
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planName: varchar("plan_name", { length: 100 }).notNull(), // "pro_monthly", "pro_yearly"
  priceKWD: integer("price_kwd").notNull(), // Price in fils (8000 = 8 KWD)
  status: subscriptionStatusEnum("status").default("pending").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  autoRenew: boolean("auto_renew").default(true),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Vendors table - Expert Marketplace partners (Tier C)
 */
export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  companyName: varchar("company_name", { length: 255 }),
  specialty: json("specialty"), // Array of specialties
  bio: text("bio"),
  logoUrl: text("logo_url"),
  status: vendorStatusEnum("status").default("pending").notNull(),
  commissionRate: integer("commission_rate").default(30), // Platform commission %
  rating: integer("rating").default(0), // 0-500 (5 stars * 100)
  totalOrders: integer("total_orders").default(0),
  isAvailable: boolean("is_available").default(true),
  passwordHash: varchar("password_hash", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;

/**
 * Orders table - Expert Marketplace orders (Tier C)
 */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "set null" }),
  requestId: integer("request_id").references(() => consultationRequests.id, { onDelete: "set null" }),
  serviceType: varchar("service_type", { length: 100 }).notNull(), // "verification", "stamping", "consultation"
  status: orderStatusEnum("status").default("pending").notNull(),
  priceKWD: integer("price_kwd").notNull(), // Total price in fils
  grossAmountKwd: integer("gross_amount_kwd"),
  discountAmountKwd: integer("discount_amount_kwd"),
  netAmountKwd: integer("net_amount_kwd"),
  currency: varchar("currency", { length: 10 }).default("KWD").notNull(),
  tierSnapshot: userTierEnum("tier_snapshot").default("free").notNull(),
  platformFeeKWD: integer("platform_fee_kwd"), // 30% commission
  vendorPayoutKWD: integer("vendor_payout_kwd"), // 70% to vendor
  documentUrl: text("document_url"),
  resultUrl: text("result_url"),
  notes: text("notes"),
  gateway: varchar("gateway", { length: 50 }),
  gatewayReference: varchar("gateway_reference", { length: 255 }),
  gatewayPaymentId: varchar("gateway_payment_id", { length: 255 }),
  assignedAt: timestamp("assigned_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Contract Analysis Results - For Compliance Score feature
 */
export const contractAnalysis = pgTable("contract_analysis", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fileId: integer("file_id").references(() => files.id, { onDelete: "set null" }),
  complianceScore: integer("compliance_score").notNull(), // 0-100
  riskLevel: varchar("risk_level", { length: 20 }).notNull(), // "safe", "risky", "critical"
  totalIssues: integer("total_issues").default(0),
  criticalIssues: integer("critical_issues").default(0),
  issueDetails: json("issue_details"), // Array of issues (blurred for free users)
  financialValue: integer("financial_value"), // Contract value in fils
  keywords: json("keywords"), // Detected keywords
  aiConfidence: integer("ai_confidence"), // 0-100
  isBlurred: boolean("is_blurred").default(true), // True for free users
  expertRecommended: boolean("expert_recommended").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ContractAnalysis = typeof contractAnalysis.$inferSelect;
export type InsertContractAnalysis = typeof contractAnalysis.$inferInsert;

/**
 * Platform Settings - For dynamic admin control
 */
export const platformSettings = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }), // "pricing", "triggers", "general"
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by"),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = typeof platformSettings.$inferInsert;

/**
 * Withdrawal requests (advisor earnings)
 */
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  advisorId: integer("advisor_id").notNull().references(() => consultants.id, { onDelete: "cascade" }),
  amountKwd: integer("amount_kwd").notNull(),
  status: withdrawalStatusEnum("status").default("pending").notNull(),
  bankDetails: json("bank_details"),
  notes: text("notes"),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  completedAt: timestamp("completed_at"),
  gatewayReference: varchar("gateway_reference", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = typeof withdrawalRequests.$inferInsert;

/**
 * Password reset tokens
 */
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * Notifications table
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 50 }).default("general").notNull(),
  status: varchar("status", { length: 20 }).default("unread").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
