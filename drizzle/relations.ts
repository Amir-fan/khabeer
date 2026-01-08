/**
 * Database relations - Foreign key relationships
 * These define the relationships between tables for Drizzle ORM
 */

import { relations } from "drizzle-orm";
import {
  users,
  conversations,
  messages,
  files,
  stocks,
  watchlist,
  apiKeys,
  tickets,
  consultants,
  subscriptions,
  orders,
  vendors,
  contractAnalysis,
  tierLimits,
  usageCounters,
  consultationRequests,
  consultationMessages,
  requestAssignments,
  advisorRatings,
  requestTransitions,
} from "./schema";

// User relations
export const usersRelations = relations(users, ({ many, one }) => ({
  conversations: many(conversations),
  files: many(files),
  watchlist: many(watchlist),
  apiKeys: many(apiKeys),
  tickets: many(tickets),
  subscriptions: many(subscriptions),
  orders: many(orders),
  contractAnalyses: many(contractAnalysis),
  usageCounters: many(usageCounters),
  consultationRequests: many(consultationRequests),
  advisorRatings: many(advisorRatings),
}));

// Conversation relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
  tickets: many(tickets),
}));

// Message relations
export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

// File relations
export const filesRelations = relations(files, ({ one, many }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
  contractAnalyses: many(contractAnalysis),
}));

// Stock relations
export const stocksRelations = relations(stocks, ({ many }) => ({
  watchlist: many(watchlist),
}));

// Watchlist relations
export const watchlistRelations = relations(watchlist, ({ one }) => ({
  user: one(users, {
    fields: [watchlist.userId],
    references: [users.id],
  }),
  stock: one(stocks, {
    fields: [watchlist.stockId],
    references: [stocks.id],
  }),
}));

// API Key relations
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

// Ticket relations
export const ticketsRelations = relations(tickets, ({ one }) => ({
  user: one(users, {
    fields: [tickets.userId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [tickets.conversationId],
    references: [conversations.id],
  }),
  consultant: one(consultants, {
    fields: [tickets.consultantId],
    references: [consultants.id],
  }),
}));

// Consultant relations
export const consultantsRelations = relations(consultants, ({ many }) => ({
  tickets: many(tickets),
  consultationRequests: many(consultationRequests),
  requestAssignments: many(requestAssignments),
  consultationMessages: many(consultationMessages),
  advisorRatings: many(advisorRatings),
}));

// Subscription relations
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

// Order relations
export const ordersRelations = relations(orders, ({ one }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  vendor: one(vendors, {
    fields: [orders.vendorId],
    references: [vendors.id],
  }),
  request: one(consultationRequests, {
    fields: [orders.requestId],
    references: [consultationRequests.id],
  }),
}));

// Vendor relations
export const vendorsRelations = relations(vendors, ({ many }) => ({
  orders: many(orders),
}));

// Contract Analysis relations
export const contractAnalysisRelations = relations(contractAnalysis, ({ one }) => ({
  user: one(users, {
    fields: [contractAnalysis.userId],
    references: [users.id],
  }),
  file: one(files, {
    fields: [contractAnalysis.fileId],
    references: [files.id],
  }),
}));

// Tier limits relations
export const tierLimitsRelations = relations(tierLimits, ({ }) => ({}));

// Usage counters relations
export const usageCountersRelations = relations(usageCounters, ({ one }) => ({
  user: one(users, {
    fields: [usageCounters.userId],
    references: [users.id],
  }),
}));

// Consultation request relations
export const consultationRequestsRelations = relations(consultationRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [consultationRequests.userId],
    references: [users.id],
  }),
  advisor: one(consultants, {
    fields: [consultationRequests.advisorId],
    references: [consultants.id],
  }),
  assignments: many(requestAssignments),
  messages: many(consultationMessages),
  ratings: many(advisorRatings),
  transitions: many(requestTransitions),
  orders: many(orders),
}));

// Request assignments relations
export const requestAssignmentsRelations = relations(requestAssignments, ({ one }) => ({
  request: one(consultationRequests, {
    fields: [requestAssignments.requestId],
    references: [consultationRequests.id],
  }),
  advisor: one(consultants, {
    fields: [requestAssignments.advisorId],
    references: [consultants.id],
  }),
}));

// Consultation messages relations
export const consultationMessagesRelations = relations(consultationMessages, ({ one }) => ({
  request: one(consultationRequests, {
    fields: [consultationMessages.requestId],
    references: [consultationRequests.id],
  }),
  senderUser: one(users, {
    fields: [consultationMessages.senderUserId],
    references: [users.id],
  }),
  senderAdvisor: one(consultants, {
    fields: [consultationMessages.senderAdvisorId],
    references: [consultants.id],
  }),
}));

// Advisor ratings relations
export const advisorRatingsRelations = relations(advisorRatings, ({ one }) => ({
  request: one(consultationRequests, {
    fields: [advisorRatings.requestId],
    references: [consultationRequests.id],
  }),
  advisor: one(consultants, {
    fields: [advisorRatings.advisorId],
    references: [consultants.id],
  }),
  user: one(users, {
    fields: [advisorRatings.userId],
    references: [users.id],
  }),
}));

// Request transitions relations
export const requestTransitionsRelations = relations(requestTransitions, ({ one }) => ({
  request: one(consultationRequests, {
    fields: [requestTransitions.requestId],
    references: [consultationRequests.id],
  }),
  actor: one(users, {
    fields: [requestTransitions.actorUserId],
    references: [users.id],
  }),
}));
