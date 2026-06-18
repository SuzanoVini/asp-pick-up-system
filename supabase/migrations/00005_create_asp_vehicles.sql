-- 00005_create_asp_vehicles.sql
CREATE TABLE asp_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  total_seats integer NOT NULL,
  kids_seats integer NOT NULL,
  booster_seats integer NOT NULL DEFAULT 0,
  license_plate text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asp_vehicles ENABLE ROW LEVEL SECURITY;
