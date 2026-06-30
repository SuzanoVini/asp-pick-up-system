import { loadRouteManagementPageData } from "../page-data";

jest.mock("../../lib/security/authorization", () => ({
	getAuthorizedUser: jest.fn(),
	requireOwner: jest.fn(),
}));
jest.mock("../../lib/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("../../lib/supabase/route-plans", () => ({ getPlanForDate: jest.fn() }));
jest.mock("../../lib/supabase/route-plan-students", () => ({ getPlanStudents: jest.fn() }));
jest.mock("../../lib/supabase/route-stops", () => ({ getStopsForPlan: jest.fn() }));
jest.mock("../../lib/supabase/routes", () => ({ getRoutesForPlan: jest.fn() }));
jest.mock("../../lib/supabase/vehicles", () => ({ getActiveVehicles: jest.fn() }));
jest.mock("../../lib/supabase/staff-schedule", () => ({
	getAvailableStaffAndAssignmentsForDate: jest.fn(),
}));

const { getAuthorizedUser, requireOwner } = jest.requireMock(
	"../../lib/security/authorization",
) as { getAuthorizedUser: jest.Mock; requireOwner: jest.Mock };
const { createClient } = jest.requireMock("../../lib/supabase/server") as {
	createClient: jest.Mock;
};
const { getPlanForDate } = jest.requireMock("../../lib/supabase/route-plans") as {
	getPlanForDate: jest.Mock;
};
const { getPlanStudents } = jest.requireMock("../../lib/supabase/route-plan-students") as {
	getPlanStudents: jest.Mock;
};
const { getStopsForPlan } = jest.requireMock("../../lib/supabase/route-stops") as {
	getStopsForPlan: jest.Mock;
};
const { getRoutesForPlan } = jest.requireMock("../../lib/supabase/routes") as {
	getRoutesForPlan: jest.Mock;
};
const { getActiveVehicles } = jest.requireMock("../../lib/supabase/vehicles") as {
	getActiveVehicles: jest.Mock;
};
const { getAvailableStaffAndAssignmentsForDate } = jest.requireMock(
	"../../lib/supabase/staff-schedule",
) as { getAvailableStaffAndAssignmentsForDate: jest.Mock };

describe("RouteManagementPage", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(requireOwner).mockImplementation(() => undefined);
	});

	it("requires owner access before loading plan data", async () => {
		const client = {};
		jest.mocked(createClient).mockResolvedValue(client);
		jest.mocked(getAuthorizedUser).mockResolvedValue({ id: "staff-1", role: "staff" });
		jest.mocked(requireOwner).mockImplementation(() => {
			throw new Error("Owner access required");
		});

		await expect(loadRouteManagementPageData("2026-07-06")).rejects.toThrow(
			"Owner access required",
		);

		expect(getAuthorizedUser).toHaveBeenCalledWith(client);
		expect(getPlanForDate).not.toHaveBeenCalled();
	});

	it("loads active vehicle and available staff options for an editable plan", async () => {
		const client = {};
		const plan = { id: "plan-1", status: "draft" };
		const route = { id: "route-1", vehicle_id: null, status: "draft", date: "2026-07-06" };
		const vehicle = {
			id: "vehicle-1",
			name: "Van 1",
			kids_seats: 8,
			booster_seats: 2,
			is_active: true,
		};
		const staff = {
			id: "staff-1",
			name: "Driver One",
			capabilities: ["driver"],
			is_active: true,
		};
		jest.mocked(createClient).mockResolvedValue(client);
		jest.mocked(getAuthorizedUser).mockResolvedValue({ id: "owner-1", role: "owner" });
		jest.mocked(getPlanForDate).mockResolvedValue(plan);
		jest.mocked(getRoutesForPlan).mockResolvedValue([route]);
		jest.mocked(getStopsForPlan).mockResolvedValue([]);
		jest.mocked(getPlanStudents).mockResolvedValue([]);
		jest.mocked(getActiveVehicles).mockResolvedValue([vehicle]);
		jest.mocked(getAvailableStaffAndAssignmentsForDate).mockResolvedValue({
			staff: [staff],
			assignments: [],
		});

		const result = await loadRouteManagementPageData("2026-07-06");

		expect(getActiveVehicles).toHaveBeenCalledWith(client);
		expect(getAvailableStaffAndAssignmentsForDate).toHaveBeenCalledWith(client, "2026-07-06");
		expect(result.editor).toEqual({
			routes: [route],
			stops: [],
			students: [],
			vehicles: [vehicle],
			staff: [staff],
			assignments: [],
		});
	});
});
