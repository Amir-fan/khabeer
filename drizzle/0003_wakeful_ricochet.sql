ALTER TYPE "public"."user_role" ADD VALUE 'advisor';--> statement-breakpoint
ALTER TYPE "public"."user_status" ADD VALUE 'deleted';--> statement-breakpoint
CREATE TABLE "consultation_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"consultation_id" integer NOT NULL,
	"uploader_user_id" integer,
	"uploader_advisor_id" integer,
	"uploader_role" "consultation_message_role" NOT NULL,
	"file_type" varchar(20) NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" varchar(120),
	"size" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "consultation_messages" ADD COLUMN "attachments" json;--> statement-breakpoint
ALTER TABLE "consultation_files" ADD CONSTRAINT "consultation_files_consultation_id_consultation_requests_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultation_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_files" ADD CONSTRAINT "consultation_files_uploader_user_id_users_id_fk" FOREIGN KEY ("uploader_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultation_files" ADD CONSTRAINT "consultation_files_uploader_advisor_id_consultants_id_fk" FOREIGN KEY ("uploader_advisor_id") REFERENCES "public"."consultants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");