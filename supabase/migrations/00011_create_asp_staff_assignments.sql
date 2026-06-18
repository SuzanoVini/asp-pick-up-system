-- 00011_create_asp_staff_assignments.sql
CREATE TABLE asp_staff_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES asp_staff(id),
  date date NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES asp_vehicles(id),
  role text NOT NULL CHECK (role IN ('driver', 'helper')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, date),
  UNIQUE (date, vehicle_id, role)
);

ALTER TABLE asp_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Staff assignment validation trigger: enforces active staff, date availability, and capability match.
-- Assignments are owner/admin only via RLS, but this trigger adds defense-in-depth.
CREATE OR REPLACE FUNCTION validate_staff_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Staff must be active
  IF NOT EXISTS (
    SELECT 1 FROM asp_staff WHERE id = NEW.staff_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Staff member is not active';
  END IF;

  -- Staff must be available on this date
  IF NOT EXISTS (
    SELECT 1 FROM asp_staff_availability
    WHERE staff_id = NEW.staff_id AND date = NEW.date AND is_available = true
  ) THEN
    RAISE EXCEPTION 'Staff member is not available on this date';
  END IF;

  -- Staff capabilities must include the assigned role
  IF NOT EXISTS (
    SELECT 1 FROM asp_staff
    WHERE id = NEW.staff_id AND NEW.role = ANY(capabilities)
  ) THEN
    RAISE EXCEPTION 'Staff member does not have the % capability', NEW.role;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_staff_assignment_validity
  BEFORE INSERT OR UPDATE ON asp_staff_assignments
  FOR EACH ROW
  EXECUTE FUNCTION validate_staff_assignment();
