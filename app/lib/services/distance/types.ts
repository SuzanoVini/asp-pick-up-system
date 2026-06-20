export interface LatLng {
	lat: number;
	lng: number;
}

export interface DistanceResult {
	km: number;
	minutes: number;
}

export interface DistanceMatrixEntry {
	origin: LatLng;
	destination: LatLng;
	result: DistanceResult | null;
}

export interface GeocodingService {
	geocode(address: string): Promise<LatLng | null>;
	distance(from: LatLng, to: LatLng): Promise<DistanceResult | null>;
	distanceMatrix(
		origins: LatLng[],
		destinations: LatLng[],
	): Promise<DistanceMatrixEntry[]>;
}
