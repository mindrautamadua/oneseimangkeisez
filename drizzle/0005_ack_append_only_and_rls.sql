-- Announcement acknowledgments are compliance evidence: append-only, like audit_events.
CREATE OR REPLACE FUNCTION announcement_acks_block_modification() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'announcement_acks is append-only (% blocked)', TG_OP;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER announcement_acks_no_update_delete
  BEFORE UPDATE OR DELETE ON announcement_acks
  FOR EACH ROW EXECUTE FUNCTION announcement_acks_block_modification();
--> statement-breakpoint
CREATE TRIGGER announcement_acks_no_truncate
  BEFORE TRUNCATE ON announcement_acks
  FOR EACH STATEMENT EXECUTE FUNCTION announcement_acks_block_modification();
--> statement-breakpoint
-- Defence in depth: the portal reaches the database only through its own server-side
-- connection (table owner, which bypasses RLS). Enabling RLS with no policies denies every
-- other role, e.g. Supabase's auto-exposed REST API roles `anon` / `authenticated`, which
-- otherwise get full CRUD on public tables. Harmless on plain PostgreSQL.
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE application_thumbnails ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE application_entitlements ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE announcement_targets ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE announcement_acks ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE news_source_state ENABLE ROW LEVEL SECURITY;
