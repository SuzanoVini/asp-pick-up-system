-- 00006_create_asp_staff.sql
CREATE TABLE asp_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  capabilities text[] NOT NULL
    CHECK (capabilities <@ ARRAY['driver','helper']::text[]
           AND cardinality(capabilities) >= 1),
  is_active boolean NOT NULL DEFAULT true,
  staff_member_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asp_staff ENABLE ROW LEVEL SECURITY;
