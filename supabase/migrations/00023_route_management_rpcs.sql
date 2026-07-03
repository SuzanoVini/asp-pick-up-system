-- Trusted transactional RPCs for attendance synchronization and manual route management.

CREATE OR REPLACE FUNCTION public.require_rpc_role(p_allow_staff boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.auth_role();
BEGIN
  IF auth.uid() IS NULL OR (v_role <> 'owner' AND NOT (p_allow_staff AND v_role = 'staff')) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.write_rpc_audit(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_changes jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.asp_audit_events(entity_type, entity_id, action, changes, performed_by)
  VALUES (p_entity_type, p_entity_id, p_action, p_changes, auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.resequence_route_stops_internal(p_route_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
BEGIN
  SELECT COALESCE(MAX(seat_number), 0) + COUNT(*)::integer + 100
  INTO v_offset
  FROM asp_route_stops
  WHERE route_id = p_route_id;

  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY order_index, seat_number, id)::integer AS position
    FROM asp_route_stops
    WHERE route_id = p_route_id
  )
  UPDATE asp_route_stops stop
  SET seat_number = v_offset + ranked.position,
      order_index = v_offset + ranked.position
  FROM ranked
  WHERE stop.id = ranked.id;

  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY order_index, seat_number, id)::integer AS position
    FROM asp_route_stops
    WHERE route_id = p_route_id
  )
  UPDATE asp_route_stops stop
  SET seat_number = ranked.position,
      order_index = ranked.position
  FROM ranked
  WHERE stop.id = ranked.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_draft_route_plan_from_attendance(p_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan asp_route_plans%ROWTYPE;
  v_route_id uuid;
BEGIN
  SELECT * INTO v_plan
  FROM asp_route_plans
  WHERE plan_date = p_date AND status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE asp_routes route
  SET status = 'stale'
  WHERE route.plan_id = v_plan.id
    AND route.status <> 'completed'
    AND EXISTS (
      SELECT 1
      FROM asp_route_stops stop
      JOIN asp_daily_attendance attendance
        ON attendance.student_id = stop.student_id AND attendance.date = p_date
      JOIN asp_students student ON student.id = stop.student_id
      WHERE stop.route_id = route.id
        AND (attendance.status NOT IN ('P', 'E', 'ED') OR student.drop_off_only)
    );

  DELETE FROM asp_route_stops stop
  USING asp_routes route, asp_daily_attendance attendance, asp_students student
  WHERE stop.route_id = route.id
    AND route.plan_id = v_plan.id
    AND route.status <> 'completed'
    AND attendance.student_id = stop.student_id
    AND attendance.date = p_date
    AND student.id = stop.student_id
    AND (attendance.status NOT IN ('P', 'E', 'ED') OR student.drop_off_only);

  INSERT INTO asp_route_plan_students(
    plan_id, student_id, school_id, attendance_status, drop_off_only, needs_booster,
    student_name_snapshot, school_name_snapshot, created_by, updated_by
  )
  SELECT
    v_plan.id,
    attendance.student_id,
    student.school_id,
    attendance.status,
    student.drop_off_only,
    CASE WHEN student.date_of_birth IS NULL THEN false
         ELSE age(p_date, student.date_of_birth) < interval '9 years' END,
    student.name,
    COALESCE(school.name, 'Unassigned school'),
    auth.uid(),
    auth.uid()
  FROM asp_daily_attendance attendance
  JOIN asp_students student ON student.id = attendance.student_id
  LEFT JOIN asp_schools school ON school.id = student.school_id
  WHERE attendance.date = p_date AND student.status = 'active'
  ON CONFLICT (plan_id, student_id) DO UPDATE SET
    school_id = EXCLUDED.school_id,
    attendance_status = EXCLUDED.attendance_status,
    drop_off_only = EXCLUDED.drop_off_only,
    needs_booster = EXCLUDED.needs_booster,
    student_name_snapshot = EXCLUDED.student_name_snapshot,
    school_name_snapshot = EXCLUDED.school_name_snapshot,
    updated_by = auth.uid();

  DELETE FROM asp_route_plan_students plan_student
  WHERE plan_student.plan_id = v_plan.id
    AND NOT EXISTS (
      SELECT 1 FROM asp_daily_attendance attendance
      WHERE attendance.date = p_date AND attendance.student_id = plan_student.student_id
    );

  UPDATE asp_route_plans plan SET
    present_count = counts.present_count,
    routable_count = counts.routable_count,
    drop_off_count = counts.drop_off_count,
    absent_count = counts.absent_count,
    school_count = counts.school_count,
    generated_at = now(),
    updated_by = auth.uid()
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE attendance_status IN ('P', 'E', 'ED'))::integer AS present_count,
      COUNT(*) FILTER (WHERE attendance_status IN ('P', 'E', 'ED') AND NOT drop_off_only AND school_id IS NOT NULL)::integer AS routable_count,
      COUNT(*) FILTER (WHERE attendance_status IN ('P', 'E', 'ED') AND drop_off_only)::integer AS drop_off_count,
      COUNT(*) FILTER (WHERE attendance_status = 'A')::integer AS absent_count,
      COUNT(DISTINCT school_id) FILTER (WHERE attendance_status IN ('P', 'E', 'ED') AND NOT drop_off_only AND school_id IS NOT NULL)::integer AS school_count
    FROM asp_route_plan_students
    WHERE plan_id = v_plan.id
  ) counts
  WHERE plan.id = v_plan.id;

  FOR v_route_id IN SELECT id FROM asp_routes WHERE plan_id = v_plan.id LOOP
    PERFORM public.resequence_route_stops_internal(v_route_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.persist_materialized_attendance_and_sync_plan(
  p_date date,
  p_rows jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.require_rpc_role(true);

  INSERT INTO asp_daily_attendance(
    student_id, date, status, original_status, effective_dismissal_time,
    is_manual_override, applied_rule_ids, modified_by, materialized_at,
    created_by, updated_by
  )
  SELECT
    row.student_id, p_date, row.status, row.original_status,
    row.effective_dismissal_time, COALESCE(row.is_manual_override, false),
    row.applied_rule_ids, COALESCE(row.modified_by, 'system'),
    COALESCE(row.materialized_at, now()), auth.uid(), auth.uid()
  FROM jsonb_to_recordset(COALESCE(p_rows, '[]'::jsonb)) AS row(
    student_id uuid,
    date date,
    status text,
    original_status text,
    effective_dismissal_time time,
    is_manual_override boolean,
    applied_rule_ids uuid[],
    modified_by text,
    materialized_at timestamptz
  )
  ON CONFLICT (student_id, date) DO UPDATE SET
    status = CASE WHEN asp_daily_attendance.is_manual_override
      THEN asp_daily_attendance.status ELSE EXCLUDED.status END,
    original_status = CASE WHEN asp_daily_attendance.is_manual_override
      THEN asp_daily_attendance.original_status ELSE EXCLUDED.original_status END,
    effective_dismissal_time = CASE WHEN asp_daily_attendance.is_manual_override
      THEN asp_daily_attendance.effective_dismissal_time ELSE EXCLUDED.effective_dismissal_time END,
    is_manual_override = asp_daily_attendance.is_manual_override OR EXCLUDED.is_manual_override,
    applied_rule_ids = CASE WHEN asp_daily_attendance.is_manual_override
      THEN asp_daily_attendance.applied_rule_ids ELSE EXCLUDED.applied_rule_ids END,
    modified_by = CASE WHEN asp_daily_attendance.is_manual_override
      THEN asp_daily_attendance.modified_by ELSE EXCLUDED.modified_by END,
    materialized_at = EXCLUDED.materialized_at,
    updated_by = auth.uid();

  PERFORM public.sync_draft_route_plan_from_attendance(p_date);
END;
$$;

CREATE OR REPLACE FUNCTION public.save_attendance_override_and_sync_plan(
  p_student_id uuid,
  p_date date,
  p_status text,
  p_effective_dismissal_time time
)
RETURNS asp_daily_attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attendance asp_daily_attendance%ROWTYPE;
BEGIN
  PERFORM public.require_rpc_role(true);
  IF p_status NOT IN ('P', 'A', 'N', 'E', 'ED', 'D') THEN
    RAISE EXCEPTION 'Invalid attendance status';
  END IF;

  INSERT INTO asp_daily_attendance(
    student_id, date, status, original_status, effective_dismissal_time,
    is_manual_override, applied_rule_ids, modified_by, materialized_at,
    created_by, updated_by
  ) VALUES (
    p_student_id, p_date, p_status, p_status, p_effective_dismissal_time,
    true, ARRAY[]::uuid[], 'manual', now(), auth.uid(), auth.uid()
  )
  ON CONFLICT (student_id, date) DO UPDATE SET
    status = EXCLUDED.status,
    effective_dismissal_time = EXCLUDED.effective_dismissal_time,
    is_manual_override = true,
    modified_by = 'manual',
    materialized_at = now(),
    updated_by = auth.uid()
  RETURNING * INTO v_attendance;

  PERFORM public.sync_draft_route_plan_from_attendance(p_date);
  PERFORM public.write_rpc_audit(
    'attendance', v_attendance.id, 'update',
    jsonb_build_object('student_id', p_student_id, 'date', p_date, 'status', p_status)
  );
  RETURN v_attendance;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_route_plan_snapshot(
  p_plan_date date,
  p_students jsonb
)
RETURNS asp_route_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan asp_route_plans%ROWTYPE;
BEGIN
  PERFORM public.require_rpc_role(false);

  SELECT * INTO v_plan FROM asp_route_plans WHERE plan_date = p_plan_date FOR UPDATE;
  IF FOUND AND (v_plan.status <> 'draft' OR EXISTS (SELECT 1 FROM asp_routes WHERE plan_id = v_plan.id)) THEN
    RAISE EXCEPTION 'Route plan snapshot cannot be replaced';
  END IF;

  IF NOT FOUND THEN
    INSERT INTO asp_route_plans(plan_date, generated_by, created_by, updated_by)
    VALUES (p_plan_date, auth.uid(), auth.uid(), auth.uid())
    RETURNING * INTO v_plan;
  END IF;

  DELETE FROM asp_route_plan_students WHERE plan_id = v_plan.id;
  INSERT INTO asp_route_plan_students(
    plan_id, student_id, school_id, attendance_status, drop_off_only, needs_booster,
    student_name_snapshot, school_name_snapshot, created_by, updated_by
  )
  SELECT
    v_plan.id, row.student_id, row.school_id, row.attendance_status,
    COALESCE(row.drop_off_only, false), COALESCE(row.needs_booster, false),
    row.student_name_snapshot, row.school_name_snapshot, auth.uid(), auth.uid()
  FROM jsonb_to_recordset(COALESCE(p_students, '[]'::jsonb)) AS row(
    student_id uuid,
    school_id uuid,
    attendance_status text,
    drop_off_only boolean,
    needs_booster boolean,
    student_name_snapshot text,
    school_name_snapshot text
  );

  UPDATE asp_route_plans plan SET
    present_count = counts.present_count,
    routable_count = counts.routable_count,
    drop_off_count = counts.drop_off_count,
    absent_count = counts.absent_count,
    school_count = counts.school_count,
    generated_at = now(),
    generated_by = auth.uid(),
    updated_by = auth.uid()
  FROM (
    SELECT
      COUNT(*) FILTER (WHERE attendance_status IN ('P', 'E', 'ED'))::integer AS present_count,
      COUNT(*) FILTER (WHERE attendance_status IN ('P', 'E', 'ED') AND NOT drop_off_only AND school_id IS NOT NULL)::integer AS routable_count,
      COUNT(*) FILTER (WHERE attendance_status IN ('P', 'E', 'ED') AND drop_off_only)::integer AS drop_off_count,
      COUNT(*) FILTER (WHERE attendance_status = 'A')::integer AS absent_count,
      COUNT(DISTINCT school_id) FILTER (WHERE attendance_status IN ('P', 'E', 'ED') AND NOT drop_off_only AND school_id IS NOT NULL)::integer AS school_count
    FROM asp_route_plan_students WHERE plan_id = v_plan.id
  ) counts
  WHERE plan.id = v_plan.id
  RETURNING plan.* INTO v_plan;

  PERFORM public.write_rpc_audit('route_plan', v_plan.id, 'update', jsonb_build_object('snapshot_replaced', true));
  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_route_plan(
  p_plan_id uuid,
  p_acknowledged_warnings text[],
  p_overridden_blockers text[],
  p_override_reason text
)
RETURNS asp_route_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan asp_route_plans%ROWTYPE;
BEGIN
  PERFORM public.require_rpc_role(false);
  SELECT * INTO v_plan FROM asp_route_plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND OR v_plan.status <> 'draft' THEN
    RAISE EXCEPTION 'Route plan is not editable';
  END IF;
  IF cardinality(COALESCE(p_overridden_blockers, ARRAY[]::text[])) > 0
     AND NULLIF(trim(p_override_reason), '') IS NULL THEN
    RAISE EXCEPTION 'Override reason is required';
  END IF;

  UPDATE asp_routes route SET
    vehicle_name_snapshot = vehicle.name,
    plate_number_snapshot = vehicle.license_plate,
    driver_name_snapshot = driver.name,
    helper_name_snapshot = helper.name,
    status = CASE WHEN route.status = 'completed' THEN route.status ELSE 'active' END,
    updated_by = auth.uid()
  FROM asp_vehicles vehicle
  LEFT JOIN asp_staff_assignments driver_assignment
    ON driver_assignment.date = v_plan.plan_date
   AND driver_assignment.vehicle_id = vehicle.id
   AND driver_assignment.role = 'driver'
  LEFT JOIN asp_staff driver ON driver.id = driver_assignment.staff_id
  LEFT JOIN asp_staff_assignments helper_assignment
    ON helper_assignment.date = v_plan.plan_date
   AND helper_assignment.vehicle_id = vehicle.id
   AND helper_assignment.role = 'helper'
  LEFT JOIN asp_staff helper ON helper.id = helper_assignment.staff_id
  WHERE route.plan_id = v_plan.id AND route.vehicle_id = vehicle.id;

  UPDATE asp_routes
  SET status = 'active', updated_by = auth.uid()
  WHERE plan_id = v_plan.id AND status <> 'completed';

  UPDATE asp_route_stops stop
  SET responsible_staff_name_snapshot = staff.name,
      updated_by = auth.uid()
  FROM asp_staff staff, asp_routes route
  WHERE stop.route_id = route.id
    AND route.plan_id = v_plan.id
    AND stop.responsible_staff_id = staff.id;

  UPDATE asp_route_plans SET
    status = 'finalized', finalized_at = now(), finalized_by = auth.uid(), updated_by = auth.uid()
  WHERE id = v_plan.id
  RETURNING * INTO v_plan;

  PERFORM public.write_rpc_audit(
    'route_plan', v_plan.id, 'update',
    jsonb_build_object(
      'finalized', true,
      'acknowledged_warnings', COALESCE(p_acknowledged_warnings, ARRAY[]::text[]),
      'overridden_blockers', COALESCE(p_overridden_blockers, ARRAY[]::text[]),
      'override_reason', p_override_reason
    )
  );
  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_route_plan(p_plan_id uuid, p_reason text)
RETURNS asp_route_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan asp_route_plans%ROWTYPE;
BEGIN
  PERFORM public.require_rpc_role(false);
  IF NULLIF(trim(p_reason), '') IS NULL THEN RAISE EXCEPTION 'Reopen reason is required'; END IF;
  UPDATE asp_route_plans SET
    status = 'draft', finalized_at = NULL, finalized_by = NULL, updated_by = auth.uid()
  WHERE id = p_plan_id AND status = 'finalized'
  RETURNING * INTO v_plan;
  IF NOT FOUND THEN RAISE EXCEPTION 'Finalized route plan not found'; END IF;
  UPDATE asp_routes SET status = 'draft', updated_by = auth.uid() WHERE plan_id = p_plan_id;
  PERFORM public.write_rpc_audit('route_plan', p_plan_id, 'update', jsonb_build_object('reopened', true, 'reason', p_reason));
  RETURN v_plan;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_route_lane(p_plan_id uuid)
RETURNS asp_routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan asp_route_plans%ROWTYPE;
  v_route asp_routes%ROWTYPE;
BEGIN
  PERFORM public.require_rpc_role(false);
  SELECT * INTO v_plan FROM asp_route_plans WHERE id = p_plan_id FOR UPDATE;
  IF NOT FOUND OR v_plan.status <> 'draft' THEN RAISE EXCEPTION 'Route plan is not editable'; END IF;
  INSERT INTO asp_routes(date, plan_id, run_number, vehicle_id, vehicle_name_snapshot, status, created_by, updated_by)
  SELECT v_plan.plan_date, v_plan.id, COALESCE(MAX(run_number), 0) + 1, NULL, NULL, 'draft', auth.uid(), auth.uid()
  FROM asp_routes WHERE plan_id = v_plan.id
  RETURNING * INTO v_route;
  PERFORM public.write_rpc_audit('route', v_route.id, 'create', jsonb_build_object('plan_id', p_plan_id, 'run_number', v_route.run_number));
  RETURN v_route;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_route_vehicle(p_route_id uuid, p_vehicle_id uuid)
RETURNS asp_routes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route asp_routes%ROWTYPE;
  v_plan_status text;
BEGIN
  PERFORM public.require_rpc_role(false);
  SELECT * INTO v_route FROM asp_routes WHERE id = p_route_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Route is not editable'; END IF;
  SELECT status INTO v_plan_status FROM asp_route_plans WHERE id = v_route.plan_id;
  IF v_plan_status <> 'draft' OR v_route.status = 'completed' THEN
    RAISE EXCEPTION 'Route is not editable';
  END IF;
  IF p_vehicle_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM asp_vehicles WHERE id = p_vehicle_id AND is_active) THEN
    RAISE EXCEPTION 'Vehicle must be active';
  END IF;
  IF p_vehicle_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM asp_routes WHERE plan_id = v_route.plan_id AND vehicle_id = p_vehicle_id AND id <> p_route_id
  ) THEN RAISE EXCEPTION 'Vehicle is already assigned to another lane'; END IF;

  UPDATE asp_routes route SET
    vehicle_id = p_vehicle_id,
    vehicle_name_snapshot = vehicle.name,
    plate_number_snapshot = vehicle.license_plate,
    driver_name_snapshot = driver.name,
    helper_name_snapshot = helper.name,
    updated_by = auth.uid()
  FROM (SELECT 1) singleton
  LEFT JOIN asp_vehicles vehicle ON vehicle.id = p_vehicle_id
  LEFT JOIN asp_staff_assignments driver_assignment
    ON driver_assignment.date = v_route.date AND driver_assignment.vehicle_id = p_vehicle_id AND driver_assignment.role = 'driver'
  LEFT JOIN asp_staff driver ON driver.id = driver_assignment.staff_id
  LEFT JOIN asp_staff_assignments helper_assignment
    ON helper_assignment.date = v_route.date AND helper_assignment.vehicle_id = p_vehicle_id AND helper_assignment.role = 'helper'
  LEFT JOIN asp_staff helper ON helper.id = helper_assignment.staff_id
  WHERE route.id = p_route_id
  RETURNING route.* INTO v_route;
  PERFORM public.write_rpc_audit('route', p_route_id, 'update', jsonb_build_object('vehicle_id', p_vehicle_id));
  RETURN v_route;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_route_lane(p_route_id uuid, p_confirm_nonempty boolean)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_status text;
  v_route_status text;
BEGIN
  PERFORM public.require_rpc_role(false);
  SELECT plan.status, route.status INTO v_plan_status, v_route_status
  FROM asp_routes route JOIN asp_route_plans plan ON plan.id = route.plan_id
  WHERE route.id = p_route_id FOR UPDATE OF route;
  IF NOT FOUND OR v_plan_status <> 'draft' OR v_route_status = 'completed' THEN RAISE EXCEPTION 'Route is not editable'; END IF;
  IF EXISTS (SELECT 1 FROM asp_route_stops WHERE route_id = p_route_id) AND NOT COALESCE(p_confirm_nonempty, false) THEN
    RAISE EXCEPTION 'Route deletion requires confirmation';
  END IF;
  PERFORM public.write_rpc_audit('route', p_route_id, 'delete', jsonb_build_object('confirmed_nonempty', p_confirm_nonempty));
  DELETE FROM asp_routes WHERE id = p_route_id;
  RETURN p_route_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_route_student(
  p_route_id uuid,
  p_student_id uuid,
  p_responsible_staff_id uuid
)
RETURNS asp_route_stops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route asp_routes%ROWTYPE;
  v_plan_status text;
  v_student asp_route_plan_students%ROWTYPE;
  v_stop asp_route_stops%ROWTYPE;
BEGIN
  PERFORM public.require_rpc_role(false);
  SELECT * INTO v_route FROM asp_routes WHERE id = p_route_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Route is not editable'; END IF;
  SELECT status INTO v_plan_status FROM asp_route_plans WHERE id = v_route.plan_id;
  IF v_plan_status <> 'draft' OR v_route.status = 'completed' THEN RAISE EXCEPTION 'Route is not editable'; END IF;
  SELECT * INTO v_student FROM asp_route_plan_students
  WHERE plan_id = v_route.plan_id AND student_id = p_student_id;
  IF NOT FOUND OR v_student.attendance_status NOT IN ('P', 'E', 'ED') OR v_student.drop_off_only OR v_student.school_id IS NULL THEN
    RAISE EXCEPTION 'Student is not routable';
  END IF;
  IF EXISTS (
    SELECT 1 FROM asp_route_stops stop JOIN asp_routes route ON route.id = stop.route_id
    WHERE route.plan_id = v_route.plan_id AND stop.student_id = p_student_id
  ) THEN RAISE EXCEPTION 'Student is already assigned'; END IF;
  IF p_responsible_staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM asp_staff staff
    JOIN asp_staff_availability availability ON availability.staff_id = staff.id
    WHERE staff.id = p_responsible_staff_id AND staff.is_active
      AND availability.date = v_route.date AND availability.is_available
  ) THEN RAISE EXCEPTION 'Responsible staff must be active and available'; END IF;

  INSERT INTO asp_route_stops(
    route_id, student_id, school_id, seat_number, order_index, needs_booster,
    student_name_snapshot, school_name_snapshot, school_address_snapshot,
    dismissal_time_snapshot, responsible_staff_id, responsible_staff_name_snapshot,
    created_by, updated_by
  )
  SELECT
    v_route.id, v_student.student_id, v_student.school_id,
    COALESCE(MAX(existing.seat_number), 0) + 1,
    COALESCE(MAX(existing.order_index), 0) + 1,
    v_student.needs_booster, v_student.student_name_snapshot, v_student.school_name_snapshot,
    school.address, school.standard_dismissal_time,
    p_responsible_staff_id, staff.name, auth.uid(), auth.uid()
  FROM asp_schools school
  LEFT JOIN asp_route_stops existing ON existing.route_id = v_route.id
  LEFT JOIN asp_staff staff ON staff.id = p_responsible_staff_id
  WHERE school.id = v_student.school_id
  GROUP BY school.address, school.standard_dismissal_time, staff.name
  RETURNING * INTO v_stop;
  PERFORM public.write_rpc_audit('route_stop', v_stop.id, 'create', jsonb_build_object('route_id', p_route_id, 'student_id', p_student_id));
  RETURN v_stop;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_route_school_group(p_route_id uuid, p_school_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_count integer := 0;
BEGIN
  PERFORM public.require_rpc_role(false);
  FOR v_student_id IN
    SELECT plan_student.student_id
    FROM asp_route_plan_students plan_student
    JOIN asp_routes route ON route.plan_id = plan_student.plan_id
    WHERE route.id = p_route_id
      AND plan_student.school_id = p_school_id
      AND plan_student.attendance_status IN ('P', 'E', 'ED')
      AND NOT plan_student.drop_off_only
      AND NOT EXISTS (
        SELECT 1 FROM asp_route_stops stop
        JOIN asp_routes assigned_route ON assigned_route.id = stop.route_id
        WHERE assigned_route.plan_id = route.plan_id AND stop.student_id = plan_student.student_id
      )
    ORDER BY plan_student.student_name_snapshot
  LOOP
    PERFORM public.assign_route_student(p_route_id, v_student_id, NULL);
    v_count := v_count + 1;
  END LOOP;
  IF v_count = 0 THEN RAISE EXCEPTION 'School has no unassigned routable students'; END IF;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_route_stop(p_stop_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_route_id uuid;
  v_plan_status text;
  v_route_status text;
BEGIN
  PERFORM public.require_rpc_role(false);
  SELECT route.id, route.status, plan.status INTO v_route_id, v_route_status, v_plan_status
  FROM asp_route_stops stop
  JOIN asp_routes route ON route.id = stop.route_id
  JOIN asp_route_plans plan ON plan.id = route.plan_id
  WHERE stop.id = p_stop_id FOR UPDATE OF route;
  IF NOT FOUND OR v_plan_status <> 'draft' OR v_route_status = 'completed' THEN RAISE EXCEPTION 'Route is not editable'; END IF;
  PERFORM public.write_rpc_audit('route_stop', p_stop_id, 'delete', jsonb_build_object('route_id', v_route_id));
  DELETE FROM asp_route_stops WHERE id = p_stop_id;
  PERFORM public.resequence_route_stops_internal(v_route_id);
  RETURN p_stop_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_route_stop(p_stop_id uuid, p_target_route_id uuid)
RETURNS asp_route_stops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stop asp_route_stops%ROWTYPE;
  v_source asp_routes%ROWTYPE;
  v_target asp_routes%ROWTYPE;
  v_source_plan_status text;
  v_target_plan_status text;
BEGIN
  PERFORM public.require_rpc_role(false);
  SELECT * INTO v_stop FROM asp_route_stops WHERE id = p_stop_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Route stop not found'; END IF;
  SELECT * INTO v_source FROM asp_routes WHERE id = v_stop.route_id FOR UPDATE;
  SELECT status INTO v_source_plan_status FROM asp_route_plans WHERE id = v_source.plan_id;
  SELECT * INTO v_target FROM asp_routes WHERE id = p_target_route_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Target route not found'; END IF;
  SELECT status INTO v_target_plan_status FROM asp_route_plans WHERE id = v_target.plan_id;
  IF v_source.plan_id IS DISTINCT FROM v_target.plan_id OR v_source_plan_status <> 'draft' OR v_target_plan_status <> 'draft'
     OR v_source.status = 'completed' OR v_target.status = 'completed' THEN
    RAISE EXCEPTION 'Routes must be editable and belong to the same plan';
  END IF;
  UPDATE asp_route_stops SET
    route_id = v_target.id,
    seat_number = (SELECT COALESCE(MAX(seat_number), 0) + 1 FROM asp_route_stops WHERE route_id = v_target.id),
    order_index = (SELECT COALESCE(MAX(order_index), 0) + 1 FROM asp_route_stops WHERE route_id = v_target.id),
    updated_by = auth.uid()
  WHERE id = p_stop_id
  RETURNING * INTO v_stop;
  PERFORM public.resequence_route_stops_internal(v_source.id);
  PERFORM public.write_rpc_audit('route_stop', p_stop_id, 'update', jsonb_build_object('from_route_id', v_source.id, 'to_route_id', v_target.id));
  RETURN v_stop;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_route_stops(p_route_id uuid, p_stop_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_status text;
  v_route_status text;
  v_count integer;
  v_offset integer;
BEGIN
  PERFORM public.require_rpc_role(false);
  SELECT plan.status, route.status INTO v_plan_status, v_route_status
  FROM asp_routes route JOIN asp_route_plans plan ON plan.id = route.plan_id
  WHERE route.id = p_route_id FOR UPDATE OF route;
  IF NOT FOUND OR v_plan_status <> 'draft' OR v_route_status = 'completed' THEN RAISE EXCEPTION 'Route is not editable'; END IF;
  SELECT COUNT(*)::integer INTO v_count FROM asp_route_stops WHERE route_id = p_route_id;
  IF v_count <> COALESCE(cardinality(p_stop_ids), 0)
     OR v_count <> (SELECT COUNT(DISTINCT id)::integer FROM unnest(COALESCE(p_stop_ids, ARRAY[]::uuid[])) AS item(id))
     OR EXISTS (SELECT 1 FROM unnest(COALESCE(p_stop_ids, ARRAY[]::uuid[])) id WHERE NOT EXISTS (
       SELECT 1 FROM asp_route_stops stop WHERE stop.id = id AND stop.route_id = p_route_id
     )) THEN RAISE EXCEPTION 'Reorder must include every route stop exactly once'; END IF;
  SELECT COALESCE(MAX(seat_number), 0) + v_count + 100
  INTO v_offset
  FROM asp_route_stops
  WHERE route_id = p_route_id;
  UPDATE asp_route_stops stop SET seat_number = v_offset + ordered.position, order_index = v_offset + ordered.position
  FROM (SELECT id, ordinality::integer AS position FROM unnest(p_stop_ids) WITH ORDINALITY AS item(id, ordinality)) ordered
  WHERE stop.id = ordered.id;
  UPDATE asp_route_stops stop SET seat_number = ordered.position, order_index = ordered.position, updated_by = auth.uid()
  FROM (SELECT id, ordinality::integer AS position FROM unnest(p_stop_ids) WITH ORDINALITY AS item(id, ordinality)) ordered
  WHERE stop.id = ordered.id;
  PERFORM public.write_rpc_audit('route', p_route_id, 'update', jsonb_build_object('ordered_stop_ids', p_stop_ids));
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_route_stop_responsible_staff(p_stop_id uuid, p_staff_id uuid)
RETURNS asp_route_stops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stop asp_route_stops%ROWTYPE;
  v_date date;
  v_plan_status text;
  v_route_status text;
BEGIN
  PERFORM public.require_rpc_role(false);
  SELECT * INTO v_stop FROM asp_route_stops WHERE id = p_stop_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Route stop not found'; END IF;
  SELECT route.date, route.status, plan.status INTO v_date, v_route_status, v_plan_status
  FROM asp_routes route JOIN asp_route_plans plan ON plan.id = route.plan_id
  WHERE route.id = v_stop.route_id;
  IF v_plan_status <> 'draft' OR v_route_status = 'completed' THEN RAISE EXCEPTION 'Route is not editable'; END IF;
  IF p_staff_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM asp_staff staff JOIN asp_staff_availability availability ON availability.staff_id = staff.id
    WHERE staff.id = p_staff_id AND staff.is_active AND availability.date = v_date AND availability.is_available
  ) THEN RAISE EXCEPTION 'Responsible staff must be active and available'; END IF;
  UPDATE asp_route_stops stop SET responsible_staff_id = p_staff_id,
    responsible_staff_name_snapshot = staff.name, updated_by = auth.uid()
  FROM (SELECT 1) singleton LEFT JOIN asp_staff staff ON staff.id = p_staff_id
  WHERE stop.id = p_stop_id RETURNING stop.* INTO v_stop;
  PERFORM public.write_rpc_audit('route_stop', p_stop_id, 'update', jsonb_build_object('responsible_staff_id', p_staff_id));
  RETURN v_stop;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_staff_assignment_for_vehicle_date(
  p_staff_id uuid,
  p_date date,
  p_vehicle_id uuid,
  p_role text
)
RETURNS asp_staff_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment asp_staff_assignments%ROWTYPE;
BEGIN
  PERFORM public.require_rpc_role(false);
  IF p_role NOT IN ('driver', 'helper') THEN RAISE EXCEPTION 'Invalid staff role'; END IF;
  DELETE FROM asp_staff_assignments WHERE staff_id = p_staff_id AND date = p_date
    AND NOT (vehicle_id = p_vehicle_id AND role = p_role);
  INSERT INTO asp_staff_assignments(staff_id, date, vehicle_id, role, created_by, updated_by)
  VALUES (p_staff_id, p_date, p_vehicle_id, p_role, auth.uid(), auth.uid())
  ON CONFLICT (date, vehicle_id, role) DO UPDATE SET staff_id = EXCLUDED.staff_id, updated_by = auth.uid()
  RETURNING * INTO v_assignment;
  UPDATE asp_routes route SET
    driver_name_snapshot = CASE WHEN p_role = 'driver' THEN staff.name ELSE route.driver_name_snapshot END,
    helper_name_snapshot = CASE WHEN p_role = 'helper' THEN staff.name ELSE route.helper_name_snapshot END,
    updated_by = auth.uid()
  FROM asp_staff staff
  WHERE route.date = p_date AND route.vehicle_id = p_vehicle_id AND route.status <> 'completed' AND staff.id = p_staff_id;
  PERFORM public.write_rpc_audit('staff_assignment', v_assignment.id, 'update', jsonb_build_object('role', p_role, 'vehicle_id', p_vehicle_id));
  RETURN v_assignment;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_staff_assignment_for_vehicle_date_role(
  p_date date,
  p_vehicle_id uuid,
  p_role text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id uuid;
BEGIN
  PERFORM public.require_rpc_role(false);
  IF p_role NOT IN ('driver', 'helper') THEN RAISE EXCEPTION 'Invalid staff role'; END IF;
  DELETE FROM asp_staff_assignments
  WHERE date = p_date AND vehicle_id = p_vehicle_id AND role = p_role
  RETURNING id INTO v_assignment_id;
  UPDATE asp_routes route SET
    driver_name_snapshot = CASE WHEN p_role = 'driver' THEN NULL ELSE route.driver_name_snapshot END,
    helper_name_snapshot = CASE WHEN p_role = 'helper' THEN NULL ELSE route.helper_name_snapshot END,
    updated_by = auth.uid()
  WHERE route.date = p_date AND route.vehicle_id = p_vehicle_id AND route.status <> 'completed';
  IF v_assignment_id IS NOT NULL THEN
    PERFORM public.write_rpc_audit('staff_assignment', v_assignment_id, 'delete', jsonb_build_object('role', p_role, 'vehicle_id', p_vehicle_id));
  END IF;
  RETURN v_assignment_id;
END;
$$;

REVOKE ALL ON FUNCTION public.require_rpc_role(boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.write_rpc_audit(text, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resequence_route_stops_internal(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_draft_route_plan_from_attendance(date) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.persist_materialized_attendance_and_sync_plan(date, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_attendance_override_and_sync_plan(uuid, date, text, time) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.replace_route_plan_snapshot(date, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finalize_route_plan(uuid, text[], text[], text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_route_plan(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_route_lane(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_route_vehicle(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_route_lane(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_route_student(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_route_school_group(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_route_stop(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.move_route_stop(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reorder_route_stops(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_route_stop_responsible_staff(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.upsert_staff_assignment_for_vehicle_date(uuid, date, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_staff_assignment_for_vehicle_date_role(date, uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.persist_materialized_attendance_and_sync_plan(date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_attendance_override_and_sync_plan(uuid, date, text, time) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_route_plan_snapshot(date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_route_plan(uuid, text[], text[], text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_route_plan(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_route_lane(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_route_vehicle(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_route_lane(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_route_student(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_route_school_group(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_route_stop(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_route_stop(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_route_stops(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_route_stop_responsible_staff(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_staff_assignment_for_vehicle_date(uuid, date, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_staff_assignment_for_vehicle_date_role(date, uuid, text) TO authenticated;
