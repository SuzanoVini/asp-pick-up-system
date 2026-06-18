-- 00008_create_asp_calendar_rules.sql
CREATE TABLE asp_calendar_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL CHECK (rule_type IN (
    'District-Wide Break', 'District Pro-D Day', 'School-Specific Holiday',
    'School Pro-D Day', 'Early Dismissal', 'Student Temporary Absence',
    'Attends Every Other Week', 'Temporary Day Switch', 'Extra Pickup Day'
  )),
  target_type text NOT NULL CHECK (target_type IN ('all', 'school', 'student')),
  target_student_id uuid REFERENCES asp_students(id),
  target_school_id uuid REFERENCES asp_schools(id),
  target_name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_of_week text[],
  switch_from_to text,
  description text,
  start_week text CHECK (start_week IN ('Absent', 'Present') OR start_week IS NULL),
  early_dismissal_time time,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  CHECK (end_date >= start_date),
  CHECK (
    (target_type = 'all' AND target_student_id IS NULL AND target_school_id IS NULL) OR
    (target_type = 'school' AND target_school_id IS NOT NULL AND target_student_id IS NULL) OR
    (target_type = 'student' AND target_student_id IS NOT NULL AND target_school_id IS NULL)
  )
);

ALTER TABLE asp_calendar_rules ENABLE ROW LEVEL SECURITY;
