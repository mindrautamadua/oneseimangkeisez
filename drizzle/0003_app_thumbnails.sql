CREATE TABLE "application_thumbnails" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_by" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_thumbnails_type" CHECK ("application_thumbnails"."content_type" in ('image/png', 'image/jpeg', 'image/webp'))
);
--> statement-breakpoint
ALTER TABLE "application_thumbnails" ADD CONSTRAINT "application_thumbnails_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;