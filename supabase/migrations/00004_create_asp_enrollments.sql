-- 00004_create_asp_enrollments.sql
CREATE TABLE asp_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES asp_students(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  contract_days text[] NOT NULL
    CHECK (contract_days <@ ARRAY['Mon','Tue','Wed','Thu','Fri']::text[]
           AND cardinality(contract_days) >= 1),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asp_enrollments ENABLE ROW LEVEL SECURITY;

-- Prevent overlapping active enrollments for the same student.
-- Uses daterange with the btree_gist extension for exclusion constraint.
-- end_date NULL means ongoing, represented as unbounded upper range.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE asp_enrollments ADD CONSTRAINT no_overlapping_active_enrollments
  EXCLUDE USING gist (
    student_id WITH =,
    daterange(start_date, COALESCE(end_date, 'infinity'::date), '[]') WITH &&
  ) WHERE (status = 'active');
