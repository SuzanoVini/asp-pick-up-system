"use server";

import { revalidatePath } from "next/cache";
import { getAuthorizedUser, requireOwner } from "@/app/lib/security/authorization";
import { createDistanceService } from "@/app/lib/services/distance";
import { createClient } from "@/app/lib/supabase/server";
import { getSystemSettings, updateSetting } from "@/app/lib/supabase/settings";

export async function updateSettingsAction(formData: {
	appName: string;
	timezone: string;
	defaultDismissalTime: string;
	defaultEarlyDismissalTime: string;
	routeOriginAddress: string;
}) {
	const supabase = await createClient();
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);

	const currentSettings = await getSystemSettings(supabase);
	const address = formData.routeOriginAddress.trim();
	let routeOriginAddress: string | null = null;
	let routeOriginLat: number | null = null;
	let routeOriginLng: number | null = null;

	if (!address) {
		routeOriginAddress = null;
		routeOriginLat = null;
		routeOriginLng = null;
	} else if (
		address === currentSettings.routeOriginAddress &&
		currentSettings.routeOriginLat !== null &&
		currentSettings.routeOriginLng !== null
	) {
		routeOriginAddress = address;
		routeOriginLat = currentSettings.routeOriginLat;
		routeOriginLng = currentSettings.routeOriginLng;
	} else {
		const service = createDistanceService();
		const location = await service.geocode(address);
		if (!location) {
			return {
				error: {
					routeOriginAddress: [
						process.env.GOOGLE_MAPS_API_KEY
							? "Google Maps could not find coordinates for that address."
							: "Google Maps API key is not configured. Add GOOGLE_MAPS_API_KEY to geocode addresses.",
					],
				},
			};
		}

		routeOriginAddress = address;
		routeOriginLat = location.lat;
		routeOriginLng = location.lng;
	}

	await updateSetting(supabase, "app_name", formData.appName.trim());
	await updateSetting(supabase, "timezone", formData.timezone);
	await updateSetting(supabase, "default_dismissal_time", formData.defaultDismissalTime);
	await updateSetting(supabase, "default_early_dismissal_time", formData.defaultEarlyDismissalTime);
	await updateSetting(supabase, "route_origin_address", routeOriginAddress);
	await updateSetting(supabase, "route_origin_lat", routeOriginLat);
	await updateSetting(supabase, "route_origin_lng", routeOriginLng);

	revalidatePath("/settings");
	revalidatePath("/route-management");
	return {
		success: true,
		settings: {
			routeOriginAddress,
			routeOriginLat,
			routeOriginLng,
		},
	};
}
