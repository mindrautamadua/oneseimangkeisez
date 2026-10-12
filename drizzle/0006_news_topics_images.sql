CREATE TABLE "news_images" (
	"news_item_id" uuid PRIMARY KEY NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"source_url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_images_type" CHECK ("news_images"."content_type" in ('image/png', 'image/jpeg', 'image/webp'))
);
--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN "topic" text DEFAULT 'industri' NOT NULL;--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN "image_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "news_images" ADD CONSTRAINT "news_images_news_item_id_news_items_id_fk" FOREIGN KEY ("news_item_id") REFERENCES "public"."news_items"("id") ON DELETE cascade ON UPDATE no action;