CREATE TYPE "public"."order_status" AS ENUM('pending', 'assigned', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'cancelled', 'expired', 'pending');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('pending', 'approved', 'banned');--> statement-breakpoint
CREATE TABLE "contract_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"file_id" integer,
	"compliance_score" integer NOT NULL,
	"risk_level" varchar(20) NOT NULL,
	"total_issues" integer DEFAULT 0,
	"critical_issues" integer DEFAULT 0,
	"issue_details" json,
	"financial_value" integer,
	"keywords" json,
	"ai_confidence" integer,
	"is_blurred" boolean DEFAULT true,
	"expert_recommended" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"vendor_id" integer,
	"service_type" varchar(100) NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"price_kwd" integer NOT NULL,
	"platform_fee_kwd" integer,
	"vendor_payout_kwd" integer,
	"document_url" text,
	"result_url" text,
	"notes" text,
	"assigned_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"category" varchar(50),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_name" varchar(100) NOT NULL,
	"price_kwd" integer NOT NULL,
	"status" "subscription_status" DEFAULT 'pending' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"auto_renew" boolean DEFAULT true,
	"payment_method" varchar(50),
	"payment_reference" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(20),
	"company_name" varchar(255),
	"specialty" json,
	"bio" text,
	"logo_url" text,
	"status" "vendor_status" DEFAULT 'pending' NOT NULL,
	"commission_rate" integer DEFAULT 30,
	"rating" integer DEFAULT 0,
	"total_orders" integer DEFAULT 0,
	"is_available" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_email_unique" UNIQUE("email")
);
