import {
	addRouteTableFromForm,
	assignStudentFromForm,
	finalizeRoutePlanFromForm,
	moveStudentStopFromForm,
	removeRouteTableFromForm,
	reorderRouteStopsFromForm,
	setRouteStaffFromForm,
	setRouteVehicleFromForm,
} from "../form-actions";

jest.mock("../../actions/route-management", () => ({
	addRouteTable: jest.fn(),
	assignStudent: jest.fn(),
	finalizeRoutePlan: jest.fn(),
	moveStudentStop: jest.fn(),
	removeRouteTable: jest.fn(),
	reorderRouteStops: jest.fn(),
	setRouteStaff: jest.fn(),
	setRouteVehicle: jest.fn(),
}));

const actions = jest.requireMock("../../actions/route-management") as Record<string, jest.Mock>;

function form(entries: Array<[string, string]>) {
	const data = new FormData();
	for (const [name, value] of entries) data.append(name, value);
	return data;
}

describe("route management form actions", () => {
	beforeEach(() => jest.clearAllMocks());

	it("maps lane and assignment controls to typed action payloads", async () => {
		await addRouteTableFromForm(form([["planId", "plan-1"]]));
		await setRouteVehicleFromForm(
			form([
				["routeId", "route-1"],
				["vehicleId", ""],
			]),
		);
		await setRouteStaffFromForm(
			form([
				["routeId", "route-1"],
				["role", "driver"],
				["staffId", "staff-1"],
			]),
		);
		await assignStudentFromForm(
			form([
				["routeId", "route-1"],
				["studentId", "student-1"],
			]),
		);

		expect(actions.addRouteTable).toHaveBeenCalledWith({ planId: "plan-1" });
		expect(actions.setRouteVehicle).toHaveBeenCalledWith({
			routeId: "route-1",
			vehicleId: null,
		});
		expect(actions.setRouteStaff).toHaveBeenCalledWith({
			routeId: "route-1",
			role: "driver",
			staffId: "staff-1",
		});
		expect(actions.assignStudent).toHaveBeenCalledWith({
			routeId: "route-1",
			studentId: "student-1",
			responsibleStaffId: null,
		});
	});

	it("preserves confirmation, target route, and complete stop order", async () => {
		await removeRouteTableFromForm(
			form([
				["routeId", "route-1"],
				["confirmNonEmpty", "true"],
			]),
		);
		await moveStudentStopFromForm(
			form([
				["stopId", "stop-1"],
				["targetRouteId", "route-2"],
			]),
		);
		await reorderRouteStopsFromForm(
			form([
				["routeId", "route-1"],
				["orderedStopId", "stop-2"],
				["orderedStopId", "stop-1"],
			]),
		);

		expect(actions.removeRouteTable).toHaveBeenCalledWith({
			routeId: "route-1",
			confirmNonEmpty: true,
		});
		expect(actions.moveStudentStop).toHaveBeenCalledWith({
			stopId: "stop-1",
			targetRouteId: "route-2",
		});
		expect(actions.reorderRouteStops).toHaveBeenCalledWith({
			routeId: "route-1",
			orderedStopIds: ["stop-2", "stop-1"],
		});
	});

	it("passes readiness acknowledgements and blocker override details", async () => {
		await finalizeRoutePlanFromForm(
			form([
				["planId", "plan-1"],
				["acknowledgedWarning", "unrouted_students"],
				["overrideCheck", "missing_driver"],
				["overrideReason", "Owner approved emergency coverage"],
			]),
		);

		expect(actions.finalizeRoutePlan).toHaveBeenCalledWith({
			planId: "plan-1",
			acknowledgedWarnings: ["unrouted_students"],
			override: {
				checkNames: ["missing_driver"],
				reason: "Owner approved emergency coverage",
			},
		});
	});
});
