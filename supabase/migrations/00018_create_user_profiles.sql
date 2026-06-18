-- 00018_create_user_profiles.sql
CREATE TABLE user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text NOT NULL DEFAULT 'staff'
    CHECK (role IN ('owner', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function for role checks (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public;

-- Users can read their own profile
CREATE POLICY "users_read_own_profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Owners can read all profiles and manage them
CREATE POLICY "owners_read_all_profiles" ON user_profiles
  FOR SELECT USING (auth_role() = 'owner');

CREATE POLICY "owners_manage_profiles" ON user_profiles
  FOR ALL USING (auth_role() = 'owner');
