CREATE TYPE "public"."announcement_priority" AS ENUM('critical', 'high', 'normal');--> statement-breakpoint
CREATE TYPE "public"."announcement_status" AS ENUM('draft', 'published', 'withdrawn');--> statement-breakpoint
CREATE TABLE "announcement_acks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"subject" text NOT NULL,
	"subject_name" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"acked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcement_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"announcement_id" uuid NOT NULL,
	"organization_id" uuid,
	"role_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_targets_not_empty" CHECK ("announcement_targets"."organization_id" is not null or "announcement_targets"."role_key" is not null)
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"body" text NOT NULL,
	"category" text NOT NULL,
	"priority" "announcement_priority" DEFAULT 'normal' NOT NULL,
	"status" "announcement_status" DEFAULT 'draft' NOT NULL,
	"audience" "audience" NOT NULL,
	"publisher" text NOT NULL,
	"publish_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"requires_ack" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"published_by" text,
	"withdrawn_by" text,
	"withdrawn_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcements_published_has_date" CHECK ("announcements"."status" = 'draft' or "announcements"."publish_at" is not null),
	CONSTRAINT "announcements_window" CHECK ("announcements"."expires_at" is null or "announcements"."publish_at" is null or "announcements"."expires_at" > "announcements"."publish_at")
);
--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"guid" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"hidden_by" text,
	CONSTRAINT "news_items_url_scheme" CHECK ("news_items"."url" ~* '^https?://')
);
--> statement-breakpoint
CREATE TABLE "news_source_state" (
	"source_key" text PRIMARY KEY NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"last_fetched" integer DEFAULT 0 NOT NULL,
	"last_accepted" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement_acks" ADD CONSTRAINT "announcement_acks_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_acks" ADD CONSTRAINT "announcement_acks_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_targets" ADD CONSTRAINT "announcement_targets_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_targets" ADD CONSTRAINT "announcement_targets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "announcement_acks_unique" ON "announcement_acks" USING btree ("announcement_id","version","subject");--> statement-breakpoint
CREATE INDEX "announcement_targets_ann_idx" ON "announcement_targets" USING btree ("announcement_id");--> statement-breakpoint
CREATE INDEX "announcements_visible_idx" ON "announcements" USING btree ("status","publish_at");--> statement-breakpoint
CREATE UNIQUE INDEX "news_items_source_guid" ON "news_items" USING btree ("source_key","guid");--> statement-breakpoint
CREATE INDEX "news_items_published_idx" ON "news_items" USING btree ("published_at");