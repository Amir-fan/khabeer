CREATE TYPE "public"."compliance_status" AS ENUM('halal', 'haram', 'doubtful');--> statement-breakpoint
CREATE TYPE "public"."consultant_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."file_status" AS ENUM('pending', 'analyzing', 'analyzed', 'error');--> statement-breakpoint
CREATE TYPE "public"."file_type" AS ENUM('contract', 'report', 'stock', 'other');--> statement-breakpoint
CREATE TYPE "public"."knowledge_type" AS ENUM('fatwa', 'standard', 'article', 'scraped');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."news_category" AS ENUM('stocks', 'gold', 'fatwas', 'markets', 'general');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'assigned', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'consultant');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_tier" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"key" varchar(64) NOT NULL,
	"name" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "consultants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(20),
	"specialty" varchar(255) NOT NULL,
	"bio" text,
	"image_url" text,
	"status" "consultant_status" DEFAULT 'active' NOT NULL,
	"max_chats_per_day" integer DEFAULT 10,
	"current_chats" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "consultants_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255),
	"context" varchar(50) DEFAULT 'general',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "file_type" DEFAULT 'other' NOT NULL,
	"mime_type" varchar(100),
	"size" integer,
	"url" text,
	"status" "file_status" DEFAULT 'pending' NOT NULL,
	"analysis_result" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"type" "knowledge_type" DEFAULT 'article' NOT NULL,
	"source" varchar(255),
	"source_url" text,
	"embedding" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"sources" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"summary" text,
	"content" text,
	"source" varchar(100),
	"source_url" text,
	"image_url" text,
	"category" "news_category" DEFAULT 'general' NOT NULL,
	"is_halal" boolean,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"exchange" varchar(50),
	"compliance_status" "compliance_status" DEFAULT 'doubtful' NOT NULL,
	"compliance_score" integer,
	"analysis_data" json,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"conversation_id" integer,
	"consultant_id" integer,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"subject" varchar(255),
	"resolution" text,
	"attachment_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(64),
	"name" text,
	"email" varchar(320),
	"phone" varchar(20),
	"password" varchar(255),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"tier" "user_tier" DEFAULT 'free' NOT NULL,
	"package_id" integer,
	"daily_questions_used" integer DEFAULT 0,
	"last_question_date" timestamp,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"language" varchar(5) DEFAULT 'ar',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_signed_in" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"stock_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
