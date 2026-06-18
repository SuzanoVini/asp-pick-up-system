-- 00001_create_asp_schools.sql
CREATE TABLE asp_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  address text,
  standard_dismissal_time time DEFAULT '15:00',
  early_dismissal_time time DEFAULT '14:00',
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  lat decimal,
  lng decimal,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asp_schools ENABLE ROW LEVEL SECURITY;
