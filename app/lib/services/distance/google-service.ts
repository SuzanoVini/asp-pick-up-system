import type { DistanceMatrixEntry, DistanceResult, GeocodingService, LatLng } from "./types";

export class GoogleDistanceService implements GeocodingService {
	private apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async geocode(_address: string): Promise<LatLng | null> {
		throw new Error("Google Maps geocoding not yet implemented");
	}

	async distance(_from: LatLng, _to: LatLng): Promise<DistanceResult | null> {
		throw new Error("Google Maps distance not yet implemented");
	}

	async distanceMatrix(
		_origins: LatLng[],
		_destinations: LatLng[],
	): Promise<DistanceMatrixEntry[]> {
		throw new Error("Google Maps distance matrix not yet implemented");
	}
}
