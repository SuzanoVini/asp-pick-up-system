-- 00020_rls_policies.sql

-- auth_role() is already defined in migration 00018 (user_profiles)

-- ============================================================
-- OWNER POLICIES: full access to all asp_* tables
-- ============================================================

CREATE POLICY "owner_full_schools" ON asp_schools FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_students" ON asp_students FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_guardians" ON asp_guardians FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_enrollments" ON asp_enrollments FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_vehicles" ON asp_vehicles FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_staff" ON asp_staff FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_waitlist" ON asp_waitlist FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_calendar_rules" ON asp_calendar_rules FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_attendance" ON asp_daily_attendance FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_staff_availability" ON asp_staff_availability FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_staff_assignments" ON asp_staff_assignments FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_routes" ON asp_routes FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "owner_full_route_stops" ON asp_route_stops FOR ALL
  USING (public.auth_role() = 'owner');

-- asp_sync_events: owner can read. No direct client UPDATE/INSERT/DELETE.
-- Sync events are created by server actions (service role) when cross-system changes occur.
-- Review updates (setting reviewed, reviewed_by, reviewed_at) go through a trusted
-- server action that uses the service role, restricting changes to only those three columns.
CREATE POLICY "owner_read_sync_events" ON asp_sync_events FOR SELECT
  USING (public.auth_role() = 'owner');

-- asp_settings: owner full (admin configuration)
CREATE POLICY "owner_full_settings" ON asp_settings FOR ALL
  USING (public.auth_role() = 'owner');

-- asp_distance_cache: server-managed (service role writes during route generation).
-- Owner gets read access for diagnostics. No client writes.
CREATE POLICY "owner_read_distance_cache" ON asp_distance_cache FOR SELECT
  USING (public.auth_role() = 'owner');

-- ============================================================
-- STAFF POLICIES: restricted read, no direct base-table SELECT on sensitive tables
-- ============================================================

-- Tables with DIRECT staff read (no sensitive columns in these tables):
CREATE POLICY "staff_read_schools" ON asp_schools FOR SELECT
  USING (public.auth_role() = 'staff');
CREATE POLICY "staff_read_staff_availability" ON asp_staff_availability FOR SELECT
  USING (public.auth_role() = 'staff');
CREATE POLICY "staff_read_staff_assignments" ON asp_staff_assignments FOR SELECT
  USING (public.auth_role() = 'staff');
CREATE POLICY "staff_read_attendance" ON asp_daily_attendance FOR SELECT
  USING (public.auth_role() = 'staff');
CREATE POLICY "staff_read_routes" ON asp_routes FOR SELECT
  USING (public.auth_role() = 'staff');
CREATE POLICY "staff_read_route_stops" ON asp_route_stops FOR SELECT
  USING (public.auth_role() = 'staff');

-- Tables where staff reads through views (sensitive columns exist):
-- asp_students   -> asp_students_staff_view   (omits DOB, home_address, comments, member_id)
-- asp_vehicles   -> asp_vehicles_staff_view   (omits license_plate)
-- asp_staff      -> asp_staff_staff_view      (omits staff_member_id)

-- Tables with NO staff access (owner only):
-- asp_guardians       -- PII (contact info)
-- asp_enrollments     -- admin data
-- asp_waitlist        -- PII
-- asp_sync_events     -- admin review
-- asp_audit_events    -- admin audit (also no direct client INSERT)
-- asp_settings        -- system config
-- asp_calendar_rules  -- admin config
-- asp_distance_cache  -- internal cache

-- ============================================================
-- STAFF OPERATIONAL VIEWS
-- Staff reads operational data through these views, not base tables.
-- Each view: omits sensitive columns, derives booster flag from DOB,
-- and includes an auth_role() check so only staff/owner can read.
-- ============================================================

CREATE VIEW asp_students_staff_view
  WITH (security_invoker = false)
AS
SELECT
  id, name, school_id, drop_off_only,
  dismissal_time, early_dismissal_time, first_pickup_date, status,
  CASE WHEN date_of_birth IS NOT NULL
       THEN age(current_date, date_of_birth) < interval '9 years'
       ELSE false
  END AS needs_booster
FROM asp_students
WHERE status = 'active'
  AND public.auth_role() IN ('staff', 'owner');

REVOKE ALL ON asp_students_staff_view FROM PUBLIC;
GRANT SELECT ON asp_students_staff_view TO authenticated;
-- Omits: date_of_birth, home_address, comments_pickup, comments_dropoff, member_id.
-- Exposes needs_booster (derived) instead of raw DOB.
-- Owner queries asp_students directly via RLS for full access.

CREATE VIEW asp_vehicles_staff_view
  WITH (security_invoker = false)
AS
SELECT
  id, name, total_seats, kids_seats, booster_seats, is_active
FROM asp_vehicles
WHERE public.auth_role() IN ('staff', 'owner');

REVOKE ALL ON asp_vehicles_staff_view FROM PUBLIC;
GRANT SELECT ON asp_vehicles_staff_view TO authenticated;
-- Omits: license_plate.

CREATE VIEW asp_staff_staff_view
  WITH (security_invoker = false)
AS
SELECT
  id, name, capabilities, is_active
FROM asp_staff
WHERE public.auth_role() IN ('staff', 'owner');

REVOKE ALL ON asp_staff_staff_view FROM PUBLIC;
GRANT SELECT ON asp_staff_staff_view TO authenticated;
-- Omits: staff_member_id.

-- ============================================================
-- AUDIT EVENTS: no direct client access (service role only)
-- No policies = default deny for all client roles
-- ============================================================
