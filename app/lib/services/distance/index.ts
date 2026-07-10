import { GoogleDistanceService } from "./google-service";
import { NullDistanceService } from "./null-service";
import type { GeocodingService } from "./types";

export function createDistanceService(): GeocodingService {
	const apiKey = process.env.GOOGLE_MAPS_API_KEY;

	if (apiKey) {
		return new GoogleDistanceService(apiKey);
	}

	return new NullDistanceService();
}

export type { DistanceResult, GeocodingService, LatLng } from "./types";
