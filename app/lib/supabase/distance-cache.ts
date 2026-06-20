import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCachedDistance(
	supabase: SupabaseClient,
	provider: string,
	originLatLng: string,
	destinationLatLng: string,
	travelMode: string,
) {
	const { data, error } = await supabase
		.from("asp_distance_cache")
		.select("*")
		.eq("provider", provider)
		.eq("origin_lat_lng", originLatLng)
		.eq("destination_lat_lng", destinationLatLng)
		.eq("travel_mode", travelMode)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function setCachedDistance(
	supabase: SupabaseClient,
	input: {
		provider: string;
		origin_lat_lng: string;
		destination_lat_lng: string;
		travel_mode: string;
		distance_km: number;
		duration_min: number;
	},
) {
	const { data, error } = await supabase
		.from("asp_distance_cache")
		.upsert(input, {
			onConflict: "provider,origin_lat_lng,destination_lat_lng,travel_mode",
		})
		.select()
		.single();

	if (error) throw error;
	return data;
}
