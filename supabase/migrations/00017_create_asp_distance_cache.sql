-- 00017_create_asp_distance_cache.sql
CREATE TABLE asp_distance_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  origin_lat_lng text NOT NULL,
  destination_lat_lng text NOT NULL,
  travel_mode text NOT NULL DEFAULT 'driving',
  distance_km decimal NOT NULL,
  duration_min decimal NOT NULL,
  cached_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, origin_lat_lng, destination_lat_lng, travel_mode)
);

ALTER TABLE asp_distance_cache ENABLE ROW LEVEL SECURITY;
