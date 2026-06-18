-- 00003_create_asp_guardians.sql
CREATE TABLE asp_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES asp_students(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asp_guardians ENABLE ROW LEVEL SECURITY;
