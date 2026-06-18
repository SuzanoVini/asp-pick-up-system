-- 00014_create_asp_sync_events.sql
CREATE TABLE asp_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  source_system text NOT NULL,
  student_id uuid REFERENCES asp_students(id),
  member_id uuid,
  payload jsonb,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE asp_sync_events ENABLE ROW LEVEL SECURITY;
