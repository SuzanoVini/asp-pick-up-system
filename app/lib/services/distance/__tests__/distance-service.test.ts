import { NullDistanceService } from "../null-service";
import { buildCacheKey } from "../cache";
import type { LatLng } from "../types";

describe("NullDistanceService", () => {
	const service = new NullDistanceService();

	it("geocode returns null without throwing", async () => {
		const result = await service.geocode("123 Test St");
		expect(result).toBeNull();
	});

	it("distance returns null without throwing", async () => {
		const from: LatLng = { lat: 49.2, lng: -123.1 };
		const to: LatLng = { lat: 49.3, lng: -123.2 };
		const result = await service.distance(from, to);
		expect(result).toBeNull();
	});

	it("distanceMatrix returns null results for all pairs", async () => {
		const origins: LatLng[] = [{ lat: 49.2, lng: -123.1 }];
		const destinations: LatLng[] = [
			{ lat: 49.3, lng: -123.2 },
			{ lat: 49.4, lng: -123.3 },
		];
		const results = await service.distanceMatrix(origins, destinations);
		expect(results).toHaveLength(2);
		for (const entry of results) {
			expect(entry.result).toBeNull();
		}
	});
});

describe("buildCacheKey", () => {
	const from: LatLng = { lat: 49.26383, lng: -123.13828 };
	const to: LatLng = { lat: 49.27191, lng: -123.15012 };

	it("produces deterministic keys", () => {
		const key1 = buildCacheKey("google_maps", from, to, "driving");
		const key2 = buildCacheKey("google_maps", from, to, "driving");
		expect(key1).toEqual(key2);
	});

	it("same inputs produce identical keys", () => {
		const a = buildCacheKey("google_maps", from, to, "driving");
		const b = buildCacheKey("google_maps", { ...from }, { ...to }, "driving");
		expect(a).toEqual(b);
	});

	it("different inputs produce different keys", () => {
		const a = buildCacheKey("google_maps", from, to, "driving");
		const b = buildCacheKey("google_maps", to, from, "driving");
		expect(a).not.toEqual(b);
	});

	it("different providers produce different keys", () => {
		const a = buildCacheKey("google_maps", from, to, "driving");
		const b = buildCacheKey("mapbox", from, to, "driving");
		expect(a.provider).not.toEqual(b.provider);
	});

	it("rounds coordinates to 5 decimal places", () => {
		const preciseFrom: LatLng = { lat: 49.263829999, lng: -123.138280001 };
		const key = buildCacheKey("google_maps", preciseFrom, to, "driving");
		expect(key.originLatLng).toBe("49.26383,-123.13828");
	});
});

describe("createDistanceService factory", () => {
	const originalEnv = process.env.GOOGLE_MAPS_API_KEY;

	afterEach(() => {
		if (originalEnv === undefined) {
			delete process.env.GOOGLE_MAPS_API_KEY;
		} else {
			process.env.GOOGLE_MAPS_API_KEY = originalEnv;
		}
	});

	it("returns NullDistanceService when no API key", () => {
		delete process.env.GOOGLE_MAPS_API_KEY;
		jest.resetModules();
		const { createDistanceService } = require("../index");
		const service = createDistanceService();
		expect(service.constructor.name).toBe("NullDistanceService");
	});

	it("returns GoogleDistanceService when API key is set", () => {
		process.env.GOOGLE_MAPS_API_KEY = "test-key-123";
		jest.resetModules();
		const { createDistanceService } = require("../index");
		const service = createDistanceService();
		expect(service.constructor.name).toBe("GoogleDistanceService");
	});
});
