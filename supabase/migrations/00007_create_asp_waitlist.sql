-- 00007_create_asp_waitlist.sql
CREATE TABLE asp_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_name text NOT NULL,
  date_of_birth date,
  school_name text,
  parent_name text,
  parent_email text,
  parent_phone text,
  intended_days text[],
  waitlisted_on date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'offered', 'enrolled', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asp_waitlist ENABLE ROW LEVEL SECURITY;
