-- 00009_create_asp_daily_attendance.sql
CREATE TABLE asp_daily_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES asp_students(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('P', 'A', 'N', 'E', 'ED', 'D')),
  original_status text,
  effective_dismissal_time time,
  is_manual_override boolean NOT NULL DEFAULT false,
  applied_rule_ids uuid[],
  modified_by text NOT NULL DEFAULT 'system',
  materialized_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);

ALTER TABLE asp_daily_attendance ENABLE ROW LEVEL SECURITY;
