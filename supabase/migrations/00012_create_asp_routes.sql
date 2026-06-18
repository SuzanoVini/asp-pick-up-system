-- 00012_create_asp_routes.sql
CREATE TABLE asp_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  vehicle_id uuid NOT NULL REFERENCES asp_vehicles(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'stale')),
  total_distance_km decimal,
  vehicle_name_snapshot text NOT NULL,
  driver_name_snapshot text,
  helper_name_snapshot text,
  exported_at timestamptz,
  exported_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  UNIQUE (date, vehicle_id)
);

ALTER TABLE asp_routes ENABLE ROW LEVEL SECURITY;
