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
