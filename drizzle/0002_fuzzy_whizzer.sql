CREATE TYPE "public"."consultation_message_role" AS ENUM('user', 'advisor', 'system');--> statement-breakpoint
CREATE TYPE "public"."contract_access_level" AS ENUM('locked', 'partial', 'full');--> statement-breakpoint
CREATE TYPE "public"."request_assignment_status" AS ENUM('offered', 'accepted', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('draft', 'submitted', 'pending_advisor', 'accepted', 'rejected', 'in_progress', 'awaiting_payment', 'paid', 'closed', 'rated');--> statement-breakpoint
CREATE TABLE "advisor_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"advisor_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"score" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultation_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"sender_role" "consultation_message_role" NOT NULL,
	"sender_user_id" integer,
	"sender_advisor_id" integer,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consultation_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"advisor_id" integer,
	"user_tier_snapshot" "user_tier" DEFAULT 'free' NOT NULL,
	"status" "request_status" DEFAULT 'submitted' NOT NULL,
	"priority_weight" integer DEFAULT 0 NOT NULL,
	"discount_rate_bps" integer DEFAULT 0 NOT NULL,
	"gross_amount_kwd" integer,
	"discount_amount_kwd" integer,
	"net_amount_kwd" integer,
	"currency" varchar(10) DEFAULT 'KWD' NOT NULL,
	"summary" text,
	"files" json,
	"awaiting_payment_at" timestamp,
	"paid_at" timestamp,
	"closed_at" timestamp,
	"rated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"advisor_id" integer NOT NULL,
	"rank" integer NOT NULL,
	"status" "request_assignment_status" DEFAULT 'offered' NOT NULL,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "request_transitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"from_status" "request_status",
	"to_status" "request_status" NOT NULL,
	"actor_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tier_limits" (
	"id" serial PRIMARY KEY NOT NULL,
	"tier" "user_tier" NOT NULL,
	"ai_daily_limit" integer,
	"advisor_chat_daily_limit" integer,
	"contract_access_level" "contract_access_level" DEFAULT 'locked' NOT NULL,
	"discount_rate_bps" integer DEFAULT 0 NOT NULL,
	"priority_weight" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tier_limits_tier_unique" UNIQUE("tier")
);
--> statement-breakpoint
CREATE TABLE "usage_counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"usage_date" date NOT NULL,
	"ai_used" integer DEFAULT 0 NOT NULL,
	"advisor_chat_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "specialties" json;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "languages" json;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "geo" json;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "availability" json;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "skills" json;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "experience_years" integer;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "rating_avg" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "consultants" ADD COLUMN "rating_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "request_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gross_amount_kwd" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_amount_kwd" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "net_amount_kwd" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "currency" varchar(10) DEFAULT 'KWD' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tier_snapshot" "user_tier" DEFAULT 'free' NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "password_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "advisor_ratings" ADD CONSTRAINT "advisor_ratings_request_id_consultation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."consultation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_ratings" ADD CONSTRAINT "advisor_ratings_advisor_id_consultants_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."consultants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "advisor_ratings" ADD CONSTRAINT "advisor_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_messages" ADD CONSTRAINT "consultation_messages_request_id_consultation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."consultation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_messages" ADD CONSTRAINT "consultation_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_messages" ADD CONSTRAINT "consultation_messages_sender_advisor_id_consultants_id_fk" FOREIGN KEY ("sender_advisor_id") REFERENCES "public"."consultants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_advisor_id_consultants_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."consultants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_request_id_consultation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."consultation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_assignments" ADD CONSTRAINT "request_assignments_advisor_id_consultants_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."consultants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_transitions" ADD CONSTRAINT "request_transitions_request_id_consultation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."consultation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_transitions" ADD CONSTRAINT "request_transitions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_analysis" ADD CONSTRAINT "contract_analysis_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_analysis" ADD CONSTRAINT "contract_analysis_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_request_id_consultation_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."consultation_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_consultant_id_consultants_id_fk" FOREIGN KEY ("consultant_id") REFERENCES "public"."consultants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_stock_id_stocks_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stocks"("id") ON DELETE cascade ON UPDATE no action;