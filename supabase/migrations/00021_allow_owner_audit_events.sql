-- 00021_allow_owner_audit_events.sql
-- Route operations write audit events from authenticated server actions.
-- Owners need scoped read/write access so audit logging does not block workflows.

CREATE POLICY "owner_read_audit_events" ON asp_audit_events FOR SELECT
  USING (public.auth_role() = 'owner');

CREATE POLICY "owner_insert_audit_events" ON asp_audit_events FOR INSERT
  WITH CHECK (public.auth_role() = 'owner');
