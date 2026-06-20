import type { LatLng } from "./types";

export function buildCacheKey(
	provider: string,
	from: LatLng,
	to: LatLng,
	travelMode: string,
): {
	provider: string;
	originLatLng: string;
	destinationLatLng: string;
	travelMode: string;
} {
	const roundTo5 = (n: number) => Number(n.toFixed(5));
	return {
		provider,
		originLatLng: `${roundTo5(from.lat)},${roundTo5(from.lng)}`,
		destinationLatLng: `${roundTo5(to.lat)},${roundTo5(to.lng)}`,
		travelMode,
	};
}
