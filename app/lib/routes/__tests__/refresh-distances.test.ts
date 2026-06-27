import type { SupabaseClient } from "@supabase/supabase-js";
import { computeRouteLegDistances, refreshRouteDistances } from "../refresh-distances";

jest.mock("../../services/distance", () => ({
	createDistanceService: jest.fn(() => ({
		distance: jest.fn().mockResolvedValue({ km: 7.5, minutes: 15 }),
	})),
}));
jest.mock("../../supabase/distance-cache", () => ({
	getCachedDistance: jest.fn().mockResolvedValue(null),
	setCachedDistance: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../supabase/route-stops", () => ({
	getStopsForRoute: jest.fn(),
	updateStop: jest.fn().mockResolvedValue({}),
}));
jest.mock("../../supabase/routes", () => ({
	updateRouteTotalDistance: jest.fn().mockResolvedValue({}),
}));

const { getStopsForRoute, updateStop } = jest.requireMock("../../supabase/route-stops") as {
	getStopsForRoute: jest.Mock;
	updateStop: jest.Mock;
};
const { updateRouteTotalDistance } = jest.requireMock("../../supabase/routes") as {
	updateRouteTotalDistance: jest.Mock;
};

describe("computeRouteLegDistances", () => {
	const mockGetDistance = jest.fn<
		Promise<{ km: number; minutes: number } | null>,
		[{ lat: number; lng: number }, { lat: number; lng: number }]
	>();

	beforeEach(() => mockGetDistance.mockReset());

	it("returns empty legs and null total for an empty stop list", async () => {
		const { legs, totalKm } = await computeRouteLegDistances([], new Map(), null, mockGetDistance);
		expect(legs).toEqual([]);
		expect(totalKm).toBeNull();
		expect(mockGetDistance).not.toHaveBeenCalled();
	});

	it("computes distance from origin to first school", async () => {
		mockGetDistance.mockResolvedValueOnce({ km: 5.0, minutes: 10 });

		const { legs, totalKm } = await computeRouteLegDistances(
			[{ id: "stop-1", schoolId: "school-A" }],
			new Map([["school-A", { lat: 1, lng: 0 }]]),
			{ lat: 0, lng: 0 },
			mockGetDistance,
		);

		expect(legs).toEqual([{ id: "stop-1", km: 5.0, minutes: 10 }]);
		expect(totalKm).toBe(5.0);
		expect(mockGetDistance).toHaveBeenCalledWith({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
	});

	it("sets null distance for first school when origin is null", async () => {
		const { legs, totalKm } = await computeRouteLegDistances(
			[{ id: "stop-1", schoolId: "school-A" }],
			new Map([["school-A", { lat: 1, lng: 0 }]]),
			null,
			mockGetDistance,
		);

		expect(legs).toEqual([{ id: "stop-1", km: null, minutes: null }]);
		expect(totalKm).toBeNull();
		expect(mockGetDistance).not.toHaveBeenCalled();
	});

	it("sets null distance for subsequent stops at the same school", async () => {
		mockGetDistance.mockResolvedValue({ km: 3.0, minutes: 6 });

		const { legs } = await computeRouteLegDistances(
			[
				{ id: "stop-1", schoolId: "school-A" },
				{ id: "stop-2", schoolId: "school-A" },
			],
			new Map([["school-A", { lat: 1, lng: 0 }]]),
			{ lat: 0, lng: 0 },
			mockGetDistance,
		);

		expect(legs[1]).toEqual({ id: "stop-2", km: null, minutes: null });
		expect(mockGetDistance).toHaveBeenCalledTimes(1);
	});

	it("computes sequential school-to-school legs", async () => {
		mockGetDistance
			.mockResolvedValueOnce({ km: 5.0, minutes: 10 }) // origin → A
			.mockResolvedValueOnce({ km: 3.0, minutes: 6 }); // A → B

		const { legs, totalKm } = await computeRouteLegDistances(
			[
				{ id: "stop-1", schoolId: "school-A" },
				{ id: "stop-2", schoolId: "school-B" },
			],
			new Map([
				["school-A", { lat: 1, lng: 0 }],
				["school-B", { lat: 2, lng: 0 }],
			]),
			{ lat: 0, lng: 0 },
			mockGetDistance,
		);

		expect(legs).toEqual([
			{ id: "stop-1", km: 5.0, minutes: 10 },
			{ id: "stop-2", km: 3.0, minutes: 6 },
		]);
		expect(totalKm).toBe(8.0);
	});

	it("skips school with no coords and continues from the previous known point", async () => {
		mockGetDistance
			.mockResolvedValueOnce({ km: 5.0, minutes: 10 }) // origin → A
			.mockResolvedValueOnce({ km: 4.0, minutes: 8 }); // A → C (B skipped, no coords)

		const { legs } = await computeRouteLegDistances(
			[
				{ id: "stop-1", schoolId: "school-A" },
				{ id: "stop-2", schoolId: "school-B" },
				{ id: "stop-3", schoolId: "school-C" },
			],
			new Map<string, { lat: number; lng: number } | null>([
				["school-A", { lat: 1, lng: 0 }],
				["school-B", null],
				["school-C", { lat: 2, lng: 0 }],
			]),
			{ lat: 0, lng: 0 },
			mockGetDistance,
		);

		expect(legs[1]).toEqual({ id: "stop-2", km: null, minutes: null });
		// C distance is measured from A (last known point)
		expect(mockGetDistance).toHaveBeenNthCalledWith(2, { lat: 1, lng: 0 }, { lat: 2, lng: 0 });
	});

	it("returns null total when there is no previous point for the first school", async () => {
		const { totalKm } = await computeRouteLegDistances(
			[{ id: "stop-1", schoolId: "school-A" }],
			new Map([["school-A", { lat: 1, lng: 0 }]]),
			null,
			mockGetDistance,
		);

		expect(totalKm).toBeNull();
	});

	it("handles a distance service failure gracefully without throwing", async () => {
		mockGetDistance.mockRejectedValueOnce(new Error("API unavailable"));

		const result = await computeRouteLegDistances(
			[{ id: "stop-1", schoolId: "school-A" }],
			new Map([["school-A", { lat: 1, lng: 0 }]]),
			{ lat: 0, lng: 0 },
			mockGetDistance,
		);

		expect(result.legs).toEqual([{ id: "stop-1", km: null, minutes: null }]);
		expect(result.totalKm).toBeNull();
	});

	it("rounds the total to 2 decimal places", async () => {
		mockGetDistance
			.mockResolvedValueOnce({ km: 1.005, minutes: 2 })
			.mockResolvedValueOnce({ km: 2.001, minutes: 4 });

		const { totalKm } = await computeRouteLegDistances(
			[
				{ id: "stop-1", schoolId: "school-A" },
				{ id: "stop-2", schoolId: "school-B" },
			],
			new Map([
				["school-A", { lat: 1, lng: 0 }],
				["school-B", { lat: 2, lng: 0 }],
			]),
			{ lat: 0, lng: 0 },
			mockGetDistance,
		);

		expect(totalKm).toBe(3.01);
	});
});

describe("refreshRouteDistances", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	function makeClient(
		schoolData: Array<{ id: string; lat: number | null; lng: number | null }>,
	): SupabaseClient {
		return {
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnValue({
					in: jest.fn().mockResolvedValue({ data: schoolData, error: null }),
				}),
			}),
		} as unknown as SupabaseClient;
	}

	it("clears the route total when route has no stops", async () => {
		getStopsForRoute.mockResolvedValue([]);
		const supabase = makeClient([]);

		await refreshRouteDistances(supabase, "route-1", null);

		expect(updateStop).not.toHaveBeenCalled();
		expect(updateRouteTotalDistance).toHaveBeenCalledWith(supabase, "route-1", null);
	});

	it("updates each stop and the route total after computing legs", async () => {
		getStopsForRoute.mockResolvedValue([
			{ id: "stop-1", school_id: "school-A", order_index: 0 },
			{ id: "stop-2", school_id: "school-A", order_index: 1 },
		]);
		const supabase = makeClient([{ id: "school-A", lat: 1, lng: 0 }]);

		await refreshRouteDistances(supabase, "route-1", null);

		// Both stops must be written (first gets null distance from origin=null, second same-school null)
		expect(updateStop).toHaveBeenCalledTimes(2);
		expect(updateStop).toHaveBeenCalledWith(supabase, "stop-1", {
			distance_from_prev_km: null,
			duration_from_prev_min: null,
		});
		expect(updateRouteTotalDistance).toHaveBeenCalledWith(supabase, "route-1", null);
	});

	it("persists computed leg distances and route total", async () => {
		getStopsForRoute.mockResolvedValue([
			{ id: "stop-1", school_id: "school-A", order_index: 0 },
			{ id: "stop-2", school_id: "school-B", order_index: 1 },
		]);
		const supabase = makeClient([
			{ id: "school-A", lat: 1, lng: 0 },
			{ id: "school-B", lat: 2, lng: 0 },
		]);

		await refreshRouteDistances(supabase, "route-1", { lat: 0, lng: 0 });

		expect(updateStop).toHaveBeenNthCalledWith(1, supabase, "stop-1", {
			distance_from_prev_km: 7.5,
			duration_from_prev_min: 15,
		});
		expect(updateStop).toHaveBeenNthCalledWith(2, supabase, "stop-2", {
			distance_from_prev_km: 7.5,
			duration_from_prev_min: 15,
		});
		expect(updateRouteTotalDistance).toHaveBeenCalledWith(supabase, "route-1", 15);
	});

	it("propagates a school query error", async () => {
		getStopsForRoute.mockResolvedValue([{ id: "stop-1", school_id: "school-A", order_index: 0 }]);
		const supabase = {
			from: jest.fn().mockReturnValue({
				select: jest.fn().mockReturnValue({
					in: jest.fn().mockResolvedValue({ data: null, error: new Error("DB error") }),
				}),
			}),
		} as unknown as SupabaseClient;

		await expect(refreshRouteDistances(supabase, "route-1", null)).rejects.toThrow("DB error");
	});
});
