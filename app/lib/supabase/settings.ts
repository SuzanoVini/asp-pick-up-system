import type { SupabaseClient } from "@supabase/supabase-js";

export async function getSetting(supabase: SupabaseClient, key: string) {
	const { data, error } = await supabase
		.from("asp_settings")
		.select("value")
		.eq("key", key)
		.single();

	if (error && error.code !== "PGRST116") throw error;
	return data?.value ?? null;
}

export async function getSystemSettings(supabase: SupabaseClient) {
	const { data, error } = await supabase.from("asp_settings").select("key, value");
	if (error) throw error;

	const settings: Record<string, unknown> = {};
	for (const row of data ?? []) {
		settings[row.key] = row.value;
	}

	return {
		defaultDismissalTime: (settings.default_dismissal_time as string) ?? "15:00",
		defaultEarlyDismissalTime: (settings.default_early_dismissal_time as string) ?? "14:00",
		timezone: (settings.timezone as string) ?? "America/Vancouver",
		appName: (settings.app_name as string) ?? "ASP Manager",
		routeOriginAddress: (settings.route_origin_address as string) ?? null,
		routeOriginLat: (settings.route_origin_lat as number) ?? null,
		routeOriginLng: (settings.route_origin_lng as number) ?? null,
	};
}

export async function updateSetting(
	supabase: SupabaseClient,
	key: string,
	value: unknown,
) {
	const { error } = await supabase
		.from("asp_settings")
		.upsert({ key, value: JSON.stringify(value) }, { onConflict: "key" });

	if (error) throw error;
}
