CREATE TYPE "public"."app_environment" AS ENUM('production', 'staging', 'development');--> statement-breakpoint
CREATE TYPE "public"."app_status" AS ENUM('available', 'pilot', 'planned', 'maintenance', 'retired');--> statement-breakpoint
CREATE TYPE "public"."audience" AS ENUM('internal', 'tenant', 'both');--> statement-breakpoint
CREATE TYPE "public"."audit_outcome" AS ENUM('success', 'failure', 'denied');--> statement-breakpoint
CREATE TYPE "public"."integration_mode" AS ENUM('oidc_sso', 'saml_sso', 'authenticated_link', 'external_link');--> statement-breakpoint
CREATE TYPE "public"."org_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('kinra', 'tenant');--> statement-breakpoint
CREATE TABLE "application_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon_key" text DEFAULT 'app-window' NOT NULL,
	"category_id" uuid NOT NULL,
	"target_url" text NOT NULL,
	"audience" "audience" NOT NULL,
	"integration_mode" "integration_mode" NOT NULL,
	"status" "app_status" DEFAULT 'planned' NOT NULL,
	"environment" "app_environment" DEFAULT 'production' NOT NULL,
	"owner_org_id" uuid,
	"application_owner" text NOT NULL,
	"business_owner" text NOT NULL,
	"support_contact" text NOT NULL,
	"display_order" integer DEFAULT 100 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_by" text NOT NULL,
	"updated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_slug_unique" UNIQUE("slug"),
	CONSTRAINT "applications_target_url_scheme" CHECK ("applications"."target_url" ~* '^https?://')
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_id" text,
	"organization_id" text,
	"event_type" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"outcome" "audit_outcome" NOT NULL,
	"correlation_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 100 NOT NULL,
	"audience_scope" "audience" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_org_id" text NOT NULL,
	"display_name" text NOT NULL,
	"org_type" "org_type" NOT NULL,
	"status" "org_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_external_org_id_unique" UNIQUE("external_org_id")
);
--> statement-breakpoint
ALTER TABLE "application_entitlements" ADD CONSTRAINT "application_entitlements_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_entitlements" ADD CONSTRAINT "application_entitlements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_owner_org_id_organizations_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entitlement_unique" ON "application_entitlements" USING btree ("application_id","organization_id","role_key");--> statement-breakpoint
CREATE INDEX "entitlement_org_idx" ON "application_entitlements" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "applications_category_idx" ON "applications" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "audit_occurred_idx" ON "audit_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_type_idx" ON "audit_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "audit_events" USING btree ("actor_id");