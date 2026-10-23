-- Deny RPC callers without a user_profiles row.
-- auth_role() is NULL for them, and the old condition evaluated to NULL instead of TRUE,
-- so plpgsql skipped the RAISE and every definer RPC ran for a profile-less session.
-- CREATE OR REPLACE keeps the existing REVOKEs from 00023.

CREATE OR REPLACE FUNCTION public.require_rpc_role(p_allow_staff boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.auth_role();
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(v_role = 'owner' OR (p_allow_staff AND v_role = 'staff'), false) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;
