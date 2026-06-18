-- 00002_create_asp_students.sql
CREATE TABLE asp_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_normalized text GENERATED ALWAYS AS (lower(trim(name))) STORED,
  school_id uuid REFERENCES asp_schools(id),
  date_of_birth date,
  home_address text,
  drop_off_only boolean NOT NULL DEFAULT false,
  dismissal_time time,
  early_dismissal_time time,
  first_pickup_date date,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'pending', 'former')),
  comments_pickup text,
  comments_dropoff text,
  member_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_asp_students_name_normalized ON asp_students(name_normalized);

ALTER TABLE asp_students ENABLE ROW LEVEL SECURITY;
