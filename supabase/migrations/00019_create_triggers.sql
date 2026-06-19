-- 00019_create_triggers.sql

-- updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all operational tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'asp_schools', 'asp_students', 'asp_guardians', 'asp_enrollments',
      'asp_vehicles', 'asp_staff', 'asp_waitlist', 'asp_calendar_rules',
      'asp_daily_attendance', 'asp_staff_availability', 'asp_staff_assignments',
      'asp_routes', 'asp_route_stops', 'user_profiles'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_%s_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl, tbl
    );
  END LOOP;
END;
$$;

-- Cross-vehicle duplicate prevention trigger
CREATE OR REPLACE FUNCTION prevent_cross_vehicle_duplicate()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM asp_route_stops rs
    JOIN asp_routes r ON rs.route_id = r.id
    WHERE rs.student_id = NEW.student_id
      AND r.date = (SELECT date FROM asp_routes WHERE id = NEW.route_id)
      AND rs.route_id != NEW.route_id
  ) THEN
    RAISE EXCEPTION 'Student % is already assigned to another vehicle on this date', NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_cross_vehicle_duplicate
  BEFORE INSERT OR UPDATE ON asp_route_stops
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cross_vehicle_duplicate();
