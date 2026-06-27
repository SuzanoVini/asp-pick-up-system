import type { SupabaseClient } from "@supabase/supabase-js";
import { createDistanceService } from "../services/distance";
import { buildCacheKey } from "../services/distance/cache";
import * as distanceCacheDb from "../supabase/distance-cache";
import { getStopsForRoute, updateStop } from "../supabase/route-stops";
import { updateRouteTotalDistance } from "../supabase/routes";

export interface LatLng {
	lat: number;
	lng: number;
}

interface LegStop {
	id: string;
	schoolId: string | null;
}

interface LegResult {
	id: string;
	km: number | null;
	minutes: number | null;
}

export async function getDistanceWithCache(
	supabase: SupabaseClient,
	from: LatLng,
	to: LatLng,
): Promise<{ km: number; minutes: number } | null> {
	const key = buildCacheKey("google_maps", from, to, "driving");
	const cached = await distanceCacheDb.getCachedDistance(
		supabase,
		key.provider,
		key.originLatLng,
		key.destinationLatLng,
		key.travelMode,
	);
	if (cached) {
		return { km: Number(cached.distance_km), minutes: Number(cached.duration_min) };
	}

	const result = await createDistanceService().distance(from, to);
	if (!result) return null;

	try {
		await distanceCacheDb.setCachedDistance(supabase, {
			provider: key.provider,
			origin_lat_lng: key.originLatLng,
			destination_lat_lng: key.destinationLatLng,
			travel_mode: key.travelMode,
			distance_km: result.km,
			duration_min: result.minutes,
		});
	} catch {
		// ponytail: best-effort — RLS may reserve cache writes to service-role
	}

	return result;
}

export async function computeRouteLegDistances(
	stops: readonly LegStop[],
	schoolCoords: Map<string, LatLng | null>,
	origin: LatLng | null,
	getDistanceFn: (from: LatLng, to: LatLng) => Promise<{ km: number; minutes: number } | null>,
): Promise<{ legs: LegResult[]; totalKm: number | null }> {
	let prev = origin;
	const seenSchools = new Set<string>();
	let total = 0;
	const legs: LegResult[] = [];

	for (const stop of stops) {
		const { id, schoolId } = stop;

		if (!schoolId || seenSchools.has(schoolId)) {
			legs.push({ id, km: null, minutes: null });
			continue;
		}

		seenSchools.add(schoolId);
		const curr = schoolCoords.get(schoolId) ?? null;

		if (!curr) {
			legs.push({ id, km: null, minutes: null });
			continue;
		}

		let km: number | null = null;
		let minutes: number | null = null;

		if (prev) {
			try {
				const result = await getDistanceFn(prev, curr);
				if (result) {
					km = result.km;
					minutes = result.minutes;
					total += result.km;
				}
			} catch {
				// Best-effort: distance failure leaves leg as null
			}
		}

		legs.push({ id, km, minutes });
		prev = curr;
	}

	return {
		legs,
		totalKm: total > 0 ? Math.round(total * 100) / 100 : null,
	};
}

export async function refreshRouteDistances(
	supabase: SupabaseClient,
	routeId: string,
	origin: LatLng | null,
): Promise<void> {
	const stops = await getStopsForRoute(supabase, routeId);
	if (!stops || stops.length === 0) {
		await updateRouteTotalDistance(supabase, routeId, null);
		return;
	}

	const schoolIds = [...new Set(stops.map((s) => s.school_id).filter((id): id is string => !!id))];
	const { data: schools, error } = await supabase
		.from("asp_schools")
		.select("id, lat, lng")
		.in("id", schoolIds);
	if (error) throw error;

	const schoolCoords = new Map(
		(schools ?? []).map((s) => [
			s.id as string,
			s.lat != null && s.lng != null ? { lat: s.lat as number, lng: s.lng as number } : null,
		]),
	);

	const { legs, totalKm } = await computeRouteLegDistances(
		stops.map((s) => ({ id: s.id, schoolId: s.school_id })),
		schoolCoords,
		origin,
		(from, to) => getDistanceWithCache(supabase, from, to),
	);

	for (const leg of legs) {
		await updateStop(supabase, leg.id, {
			distance_from_prev_km: leg.km,
			duration_from_prev_min: leg.minutes,
		});
	}

	await updateRouteTotalDistance(supabase, routeId, totalKm);
}
