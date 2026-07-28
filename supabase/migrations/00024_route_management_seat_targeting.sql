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
