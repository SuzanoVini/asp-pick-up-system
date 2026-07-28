-- Seat targeting, swap semantics, and seat/order decoupling for route management.

-- Seats are now fixed physical slots (one per vehicle seat template). A vacated
-- seat must stay empty; only pickup order should compact when a stop is removed.
CREATE OR REPLACE FUNCTION public.resequence_route_stops_internal(p_route_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
BEGIN
  SELECT COALESCE(MAX(order_index), 0) + COUNT(*)::integer + 100
  INTO v_offset
  FROM asp_route_stops
  WHERE route_id = p_route_id;

  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY order_index, seat_number, id)::integer AS position
    FROM asp_route_stops
    WHERE route_id = p_route_id
  )
  UPDATE asp_route_stops stop
  SET order_index = v_offset + ranked.position
  FROM ranked
  WHERE stop.id = ranked.id;

  WITH ranked AS (
    SELECT id, row_number() OVER (ORDER BY order_index, seat_number, id)::integer AS position
    FROM asp_route_stops
    WHERE route_id = p_route_id
  )
  UPDATE asp_route_stops stop
  SET order_index = ranked.position
  FROM ranked
  WHERE stop.id = ranked.id;
END;
$$;

-- Pickup order (order_index) is independently editable and must never move a
-- student between physical seats. Only order_index compacts here.
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
  SELECT COALESCE(MAX(order_index), 0) + v_count + 100
  INTO v_offset
  FROM asp_route_stops
  WHERE route_id = p_route_id;
  UPDATE asp_route_stops stop SET order_index = v_offset + ordered.position
  FROM (SELECT id, ordinality::integer AS position FROM unnest(p_stop_ids) WITH ORDINALITY AS item(id, ordinality)) ordered
  WHERE stop.id = ordered.id;
  UPDATE asp_route_stops stop SET order_index = ordered.position, updated_by = auth.uid()
  FROM (SELECT id, ordinality::integer AS position FROM unnest(p_stop_ids) WITH ORDINALITY AS item(id, ordinality)) ordered
  WHERE stop.id = ordered.id;
  PERFORM public.write_rpc_audit('route', p_route_id, 'update', jsonb_build_object('ordered_stop_ids', p_stop_ids));
  RETURN v_count;
END;
$$;

DROP FUNCTION IF EXISTS public.assign_route_student(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.assign_route_student(
  p_route_id uuid,
  p_student_id uuid,
  p_responsible_staff_id uuid,
  p_seat_number integer DEFAULT NULL
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
  v_bumped_stop_id uuid;
BEGIN
  PERFORM public.require_rpc_role(false);
  -- -1 is the internal swap sentinel; direct RPC callers must never claim it.
  IF p_seat_number IS NOT NULL AND p_seat_number < 1 THEN
    RAISE EXCEPTION 'Seat number must be a positive integer';
  END IF;
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

  IF p_seat_number IS NOT NULL THEN
    -- Bump any existing occupant of the requested seat back to unrouted:
    -- they came from the unrouted pool, not another seat, so there is
    -- nothing to swap them into. Audit the bump so the removal is traceable.
    DELETE FROM asp_route_stops WHERE route_id = v_route.id AND seat_number = p_seat_number
    RETURNING id INTO v_bumped_stop_id;
    IF v_bumped_stop_id IS NOT NULL THEN
      PERFORM public.write_rpc_audit('route_stop', v_bumped_stop_id, 'delete',
        jsonb_build_object('route_id', v_route.id, 'seat_number', p_seat_number, 'bumped_for_student_id', p_student_id));
    END IF;
  END IF;

  INSERT INTO asp_route_stops(
    route_id, student_id, school_id, seat_number, order_index, needs_booster,
    student_name_snapshot, school_name_snapshot, school_address_snapshot,
    dismissal_time_snapshot, responsible_staff_id, responsible_staff_name_snapshot,
    created_by, updated_by
  )
  SELECT
    v_route.id, v_student.student_id, v_student.school_id,
    COALESCE(p_seat_number, COALESCE(MAX(existing.seat_number), 0) + 1),
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
  IF v_bumped_stop_id IS NOT NULL THEN
    -- The bumped stop took an order_index with it, so pickup order now has a
    -- hole (e.g. 2,3,4 with no 1). Compact it; seats are unaffected because
    -- this helper only touches order_index.
    PERFORM public.resequence_route_stops_internal(v_route.id);
    SELECT * INTO v_stop FROM asp_route_stops WHERE id = v_stop.id;
  END IF;
  PERFORM public.write_rpc_audit('route_stop', v_stop.id, 'create', jsonb_build_object('route_id', p_route_id, 'student_id', p_student_id, 'seat_number', p_seat_number));
  RETURN v_stop;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_route_student(uuid, uuid, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_route_student(uuid, uuid, uuid, integer) TO authenticated;
