-- 00016_create_asp_settings.sql
CREATE TABLE asp_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE asp_settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings
INSERT INTO asp_settings (key, value) VALUES
  ('app_name', '"ASP Manager"'),
  ('default_dismissal_time', '"15:00"'),
  ('default_early_dismissal_time', '"14:00"'),
  ('timezone', '"America/Vancouver"'),
  ('route_origin_address', 'null'),
  ('route_origin_lat', 'null'),
  ('route_origin_lng', 'null');
