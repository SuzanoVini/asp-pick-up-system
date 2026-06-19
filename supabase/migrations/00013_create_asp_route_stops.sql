-- 00013_create_asp_route_stops.sql
CREATE TABLE asp_route_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid NOT NULL REFERENCES asp_routes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES asp_students(id),
  school_id uuid NOT NULL REFERENCES asp_schools(id),
  seat_number integer NOT NULL,
  order_index integer NOT NULL,
  distance_from_prev_km decimal,
  duration_from_prev_min decimal,
  needs_booster boolean NOT NULL DEFAULT false,
  student_name_snapshot text NOT NULL,
  school_name_snapshot text NOT NULL,
  school_address_snapshot text,
  dismissal_time_snapshot time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (route_id, student_id),
  UNIQUE (route_id, seat_number)
);

ALTER TABLE asp_route_stops ENABLE ROW LEVEL SECURITY;
