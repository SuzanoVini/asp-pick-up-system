import {
	createRouteStopSchema,
	generateRouteSchema,
	moveStopSchema,
	readinessOverrideSchema,
	routeStatusTransitionSchema,
} from "../../schemas/route-schemas";
import { staffAssignmentSchema, staffAvailabilityToggleSchema } from "../../schemas/staff-schedule";

describe("generateRouteSchema", () => {
	it("accepts a valid ISO date", () => {
		const result = generateRouteSchema.safeParse({ date: "2026-10-05" });
		expect(result.success).toBe(true);
	});

	it("rejects an invalid date format", () => {
		const result = generateRouteSchema.safeParse({ date: "10/05/2026" });
		expect(result.success).toBe(false);
	});

	it("rejects an empty date", () => {
		const result = generateRouteSchema.safeParse({ date: "" });
		expect(result.success).toBe(false);
	});

	it("rejects a date with extra characters", () => {
		const result = generateRouteSchema.safeParse({ date: "2026-10-05T00:00:00" });
		expect(result.success).toBe(false);
	});
});

describe("createRouteStopSchema", () => {
	const validStop = {
		route_id: "a0000000-0000-4000-8000-000000000001",
		student_id: "b0000000-0000-4000-8000-000000000001",
		school_id: "c0000000-0000-4000-8000-000000000001",
		seat_number: 1,
		order_index: 0,
		student_name_snapshot: "Student A",
		school_name_snapshot: "School A",
	};

	it("accepts a valid route stop", () => {
		const result = createRouteStopSchema.safeParse(validStop);
		expect(result.success).toBe(true);
	});

	it("rejects seat_number of zero", () => {
		const result = createRouteStopSchema.safeParse({ ...validStop, seat_number: 0 });
		expect(result.success).toBe(false);
	});

	it("rejects negative seat_number", () => {
		const result = createRouteStopSchema.safeParse({ ...validStop, seat_number: -1 });
		expect(result.success).toBe(false);
	});

	it("rejects non-integer seat_number", () => {
		const result = createRouteStopSchema.safeParse({ ...validStop, seat_number: 1.5 });
		expect(result.success).toBe(false);
	});

	it("rejects drop_off_only = true", () => {
		const result = createRouteStopSchema.safeParse({ ...validStop, drop_off_only: true });
		expect(result.success).toBe(false);
	});

	it("accepts drop_off_only = false (explicit)", () => {
		const result = createRouteStopSchema.safeParse({ ...validStop, drop_off_only: false });
		expect(result.success).toBe(true);
	});

	it("accepts without drop_off_only (omitted)", () => {
		const result = createRouteStopSchema.safeParse(validStop);
		expect(result.success).toBe(true);
	});

	it("rejects invalid UUID for route_id", () => {
		const result = createRouteStopSchema.safeParse({ ...validStop, route_id: "not-a-uuid" });
		expect(result.success).toBe(false);
	});
});

describe("routeStatusTransitionSchema", () => {
	it("allows draft -> active", () => {
		const result = routeStatusTransitionSchema.safeParse({
			route_id: "a0000000-0000-4000-8000-000000000001",
			current_status: "draft",
			new_status: "active",
		});
		expect(result.success).toBe(true);
	});

	it("allows active -> completed", () => {
		const result = routeStatusTransitionSchema.safeParse({
			route_id: "a0000000-0000-4000-8000-000000000001",
			current_status: "active",
			new_status: "completed",
		});
		expect(result.success).toBe(true);
	});

	it("allows completed -> draft (reopen)", () => {
		const result = routeStatusTransitionSchema.safeParse({
			route_id: "a0000000-0000-4000-8000-000000000001",
			current_status: "completed",
			new_status: "draft",
		});
		expect(result.success).toBe(true);
	});

	it("allows stale -> active (reviewed)", () => {
		const result = routeStatusTransitionSchema.safeParse({
			route_id: "a0000000-0000-4000-8000-000000000001",
			current_status: "stale",
			new_status: "active",
		});
		expect(result.success).toBe(true);
	});

	it("rejects draft -> completed (must go through active)", () => {
		const result = routeStatusTransitionSchema.safeParse({
			route_id: "a0000000-0000-4000-8000-000000000001",
			current_status: "draft",
			new_status: "completed",
		});
		expect(result.success).toBe(false);
	});

	it("rejects completed -> active (must reopen to draft first)", () => {
		const result = routeStatusTransitionSchema.safeParse({
			route_id: "a0000000-0000-4000-8000-000000000001",
			current_status: "completed",
			new_status: "active",
		});
		expect(result.success).toBe(false);
	});

	it("rejects active -> draft (no backward without stale)", () => {
		const result = routeStatusTransitionSchema.safeParse({
			route_id: "a0000000-0000-4000-8000-000000000001",
			current_status: "active",
			new_status: "draft",
		});
		expect(result.success).toBe(false);
	});
});

describe("readinessOverrideSchema", () => {
	it("accepts valid override", () => {
		const result = readinessOverrideSchema.safeParse({
			route_id: "a0000000-0000-4000-8000-000000000001",
			overridden_checks: ["stale_route", "missing_driver"],
			reason: "Driver confirmed verbally",
		});
		expect(result.success).toBe(true);
	});

	it("rejects empty reason", () => {
		const result = readinessOverrideSchema.safeParse({
			route_id: "a0000000-0000-4000-8000-000000000001",
			overridden_checks: ["stale_route"],
			reason: "",
		});
		expect(result.success).toBe(false);
	});

	it("rejects empty overridden_checks", () => {
		const result = readinessOverrideSchema.safeParse({
			route_id: "a0000000-0000-4000-8000-000000000001",
			overridden_checks: [],
			reason: "Override reason",
		});
		expect(result.success).toBe(false);
	});
});

describe("moveStopSchema", () => {
	it("rejects non-positive seat number", () => {
		const result = moveStopSchema.safeParse({
			stop_id: "a0000000-0000-4000-8000-000000000001",
			target_route_id: "b0000000-0000-4000-8000-000000000001",
			new_seat_number: 0,
			new_order_index: 0,
		});
		expect(result.success).toBe(false);
	});
});

describe("staffAssignmentSchema", () => {
	it("accepts driver role", () => {
		const result = staffAssignmentSchema.safeParse({
			staff_id: "a0000000-0000-4000-8000-000000000001",
			date: "2026-10-05",
			vehicle_id: "b0000000-0000-4000-8000-000000000001",
			role: "driver",
		});
		expect(result.success).toBe(true);
	});

	it("accepts helper role", () => {
		const result = staffAssignmentSchema.safeParse({
			staff_id: "a0000000-0000-4000-8000-000000000001",
			date: "2026-10-05",
			vehicle_id: "b0000000-0000-4000-8000-000000000001",
			role: "helper",
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid role", () => {
		const result = staffAssignmentSchema.safeParse({
			staff_id: "a0000000-0000-4000-8000-000000000001",
			date: "2026-10-05",
			vehicle_id: "b0000000-0000-4000-8000-000000000001",
			role: "manager",
		});
		expect(result.success).toBe(false);
	});
});

describe("staffAvailabilityToggleSchema", () => {
	it("accepts valid availability toggle", () => {
		const result = staffAvailabilityToggleSchema.safeParse({
			staff_id: "a0000000-0000-4000-8000-000000000001",
			date: "2026-10-05",
			is_available: true,
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid date format", () => {
		const result = staffAvailabilityToggleSchema.safeParse({
			staff_id: "a0000000-0000-4000-8000-000000000001",
			date: "October 5",
			is_available: true,
		});
		expect(result.success).toBe(false);
	});
});
