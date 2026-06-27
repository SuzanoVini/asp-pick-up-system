-- Route-plan source data and daily summary.
CREATE TABLE asp_route_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_date date NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized')),
  present_count integer NOT NULL DEFAULT 0 CHECK (present_count >= 0),
  routable_count integer NOT NULL DEFAULT 0 CHECK (routable_count >= 0),
  drop_off_count integer NOT NULL DEFAULT 0 CHECK (drop_off_count >= 0),
  absent_count integer NOT NULL DEFAULT 0 CHECK (absent_count >= 0),
  school_count integer NOT NULL DEFAULT 0 CHECK (school_count >= 0),
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES auth.users(id),
  finalized_at timestamptz,
  finalized_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE TABLE asp_route_plan_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES asp_route_plans(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES asp_students(id),
  school_id uuid REFERENCES asp_schools(id),
  attendance_status text NOT NULL
    CHECK (attendance_status IN ('P', 'A', 'N', 'E', 'ED', 'D')),
  drop_off_only boolean NOT NULL DEFAULT false,
  needs_booster boolean NOT NULL DEFAULT false,
  student_name_snapshot text NOT NULL,
  school_name_snapshot text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (plan_id, student_id)
);

COMMENT ON COLUMN asp_route_plans.present_count IS
  'All students with attendance status P, E, or ED, including drop-off-only and missing-school students.';
COMMENT ON COLUMN asp_route_plans.routable_count IS
  'Students with attendance status P, E, or ED, excluding drop-off-only and missing-school students.';
COMMENT ON COLUMN asp_route_plans.drop_off_count IS
  'Students with a routable attendance status who are marked drop-off-only.';
COMMENT ON COLUMN asp_route_plans.school_count IS
  'Distinct schools represented by routable students.';

ALTER TABLE asp_route_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE asp_route_plan_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_full_route_plans" ON asp_route_plans FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "staff_read_route_plans" ON asp_route_plans FOR SELECT
  USING (public.auth_role() = 'staff');
CREATE POLICY "owner_full_route_plan_students" ON asp_route_plan_students FOR ALL
  USING (public.auth_role() = 'owner');
CREATE POLICY "staff_read_route_plan_students" ON asp_route_plan_students FOR SELECT
  USING (public.auth_role() = 'staff');

CREATE TRIGGER set_asp_route_plans_updated_at
  BEFORE UPDATE ON asp_route_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_asp_route_plan_students_updated_at
  BEFORE UPDATE ON asp_route_plan_students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE asp_routes
  ADD COLUMN plan_id uuid REFERENCES asp_route_plans(id) ON DELETE CASCADE,
  ADD COLUMN run_number integer NOT NULL DEFAULT 1 CHECK (run_number > 0),
  ADD COLUMN plate_number_snapshot text,
  ALTER COLUMN vehicle_id DROP NOT NULL,
  ALTER COLUMN vehicle_name_snapshot DROP NOT NULL,
  DROP CONSTRAINT asp_routes_date_vehicle_id_key;

CREATE UNIQUE INDEX asp_routes_plan_id_run_number_key
  ON asp_routes(plan_id, run_number)
  WHERE plan_id IS NOT NULL;
CREATE UNIQUE INDEX asp_routes_legacy_date_vehicle_id_key
  ON asp_routes(date, vehicle_id)
  WHERE plan_id IS NULL AND vehicle_id IS NOT NULL;
CREATE INDEX idx_asp_routes_plan_id_status ON asp_routes(plan_id, status);

DROP POLICY "staff_read_routes" ON asp_routes;

CREATE VIEW asp_routes_staff_view
  WITH (security_invoker = false)
AS
SELECT
  id, plan_id, date, vehicle_id, run_number, status, total_distance_km,
  vehicle_name_snapshot, driver_name_snapshot, helper_name_snapshot,
  exported_at, created_at, updated_at
FROM asp_routes
WHERE public.auth_role() IN ('staff', 'owner');

REVOKE ALL ON asp_routes_staff_view FROM PUBLIC;
GRANT SELECT ON asp_routes_staff_view TO authenticated;

ALTER TABLE asp_route_stops
  ADD COLUMN responsible_staff_id uuid REFERENCES asp_staff(id),
  ADD COLUMN responsible_staff_name_snapshot text,
  ADD CONSTRAINT asp_route_stops_seat_number_positive CHECK (seat_number > 0),
  ADD CONSTRAINT asp_route_stops_order_index_nonnegative CHECK (order_index >= 0);

CREATE OR REPLACE FUNCTION prevent_cross_vehicle_duplicate()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM asp_route_stops rs
    JOIN asp_routes r ON rs.route_id = r.id
    WHERE rs.student_id = NEW.student_id
      AND r.date = (SELECT date FROM asp_routes WHERE id = NEW.route_id)
      AND rs.route_id != NEW.route_id
      AND rs.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'Student % is already assigned to another vehicle on this date', NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
