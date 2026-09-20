-- Constraints Drizzle can't express. Runs on Supabase and on local PGlite.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
-- No double booking: two live stays on the same unit may not overlap ([check_in, check_out)).
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist ("unit_id" WITH =, daterange("check_in", "check_out") WITH &&)
  WHERE ("kind" = 'stay' AND "status" IN ('hold','pending_payment','confirmed','checked_in'));
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_dates_chk"
  CHECK ("kind" <> 'stay' OR ("check_in" IS NOT NULL AND "check_out" > "check_in"));
--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_name_ja_chk" CHECK ("name" ? 'ja');
--> statement-breakpoint
-- REI-1001, REI-1002, ...
CREATE SEQUENCE IF NOT EXISTS "reservation_code_seq" START 1001;
--> statement-breakpoint
-- Audit log is append-only.
CREATE OR REPLACE FUNCTION audit_logs_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_logs_immutable();
