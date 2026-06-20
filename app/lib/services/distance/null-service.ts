import type { DistanceMatrixEntry, DistanceResult, GeocodingService, LatLng } from "./types";

export class NullDistanceService implements GeocodingService {
	async geocode(_address: string): Promise<LatLng | null> {
		return null;
	}

	async distance(_from: LatLng, _to: LatLng): Promise<DistanceResult | null> {
		return null;
	}

	async distanceMatrix(
		origins: LatLng[],
		destinations: LatLng[],
	): Promise<DistanceMatrixEntry[]> {
		return origins.flatMap((origin) =>
			destinations.map((destination) => ({
				origin,
				destination,
				result: null,
			})),
		);
	}
}
