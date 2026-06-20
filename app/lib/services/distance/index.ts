import type { GeocodingService } from "./types";
import { NullDistanceService } from "./null-service";
import { GoogleDistanceService } from "./google-service";

export function createDistanceService(): GeocodingService {
	const apiKey = process.env.GOOGLE_MAPS_API_KEY;

	if (apiKey) {
		return new GoogleDistanceService(apiKey);
	}

	return new NullDistanceService();
}

export type { GeocodingService, LatLng, DistanceResult } from "./types";
