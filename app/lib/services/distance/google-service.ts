import type { DistanceMatrixEntry, DistanceResult, GeocodingService, LatLng } from "./types";

interface GoogleGeocodeResponse {
	status: string;
	error_message?: string;
	results?: Array<{
		geometry?: {
			location?: {
				lat: number;
				lng: number;
			};
		};
	}>;
}

interface GoogleDistanceMatrixResponse {
	status: string;
	error_message?: string;
	rows?: Array<{
		elements?: Array<{
			status: string;
			distance?: { value: number };
			duration?: { value: number };
		}>;
	}>;
}

export class GoogleDistanceService implements GeocodingService {
	private apiKey: string;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async geocode(address: string): Promise<LatLng | null> {
		const trimmed = address.trim();
		if (!trimmed) return null;

		const params = new URLSearchParams({
			address: trimmed,
			key: this.apiKey,
		});
		const response = await fetch(
			`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
		);
		if (!response.ok) {
			throw new Error(`Google Maps geocoding failed with HTTP ${response.status}`);
		}

		const body = (await response.json()) as GoogleGeocodeResponse;
		if (body.status === "ZERO_RESULTS") return null;
		if (body.status !== "OK") {
			throw new Error(body.error_message ?? `Google Maps geocoding failed: ${body.status}`);
		}

		const location = body.results?.[0]?.geometry?.location;
		return location ? { lat: location.lat, lng: location.lng } : null;
	}

	async distance(from: LatLng, to: LatLng): Promise<DistanceResult | null> {
		const [entry] = await this.distanceMatrix([from], [to]);
		return entry?.result ?? null;
	}

	async distanceMatrix(origins: LatLng[], destinations: LatLng[]): Promise<DistanceMatrixEntry[]> {
		if (origins.length === 0 || destinations.length === 0) return [];

		const params = new URLSearchParams({
			origins: origins.map(formatLatLng).join("|"),
			destinations: destinations.map(formatLatLng).join("|"),
			mode: "driving",
			units: "metric",
			key: this.apiKey,
		});
		const response = await fetch(
			`https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`,
		);
		if (!response.ok) {
			throw new Error(`Google Maps distance matrix failed with HTTP ${response.status}`);
		}

		const body = (await response.json()) as GoogleDistanceMatrixResponse;
		if (body.status !== "OK") {
			throw new Error(body.error_message ?? `Google Maps distance matrix failed: ${body.status}`);
		}

		return origins.flatMap((origin, originIndex) =>
			destinations.map((destination, destinationIndex) => {
				const element = body.rows?.[originIndex]?.elements?.[destinationIndex];
				const result =
					element?.status === "OK" && element.distance && element.duration
						? {
								km: roundTo2(element.distance.value / 1000),
								minutes: Math.max(1, Math.round(element.duration.value / 60)),
							}
						: null;

				return { origin, destination, result };
			}),
		);
	}
}

function formatLatLng(point: LatLng): string {
	return `${point.lat},${point.lng}`;
}

function roundTo2(value: number): number {
	return Math.round(value * 100) / 100;
}
