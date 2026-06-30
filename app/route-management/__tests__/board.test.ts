import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteManagementBoard } from "../route-management-board";

jest.mock("../form-actions", () => ({
	addRouteTableFromForm: jest.fn(),
	assignSchoolGroupFromForm: jest.fn(),
	assignStudentFromForm: jest.fn(),
	moveStudentStopFromForm: jest.fn(),
	removeRouteTableFromForm: jest.fn(),
	removeStudentStopFromForm: jest.fn(),
	reorderRouteStopsFromForm: jest.fn(),
	setRouteStaffFromForm: jest.fn(),
	setRouteVehicleFromForm: jest.fn(),
}));

describe("RouteManagementBoard", () => {
	it("renders minimal lane, assignment, and stop-order controls", () => {
		const html = renderToStaticMarkup(
			createElement(RouteManagementBoard, {
				planId: "plan-1",
				editable: true,
				routes: [
					{
						id: "route-1",
						date: "2026-07-06",
						vehicle_id: "vehicle-1",
						status: "draft",
						run_number: 1,
					},
				],
				stops: [
					{
						id: "stop-1",
						route_id: "route-1",
						student_id: "student-1",
						student_name_snapshot: "Assigned Student",
						school_name_snapshot: "School One",
						order_index: 1,
						seat_number: 1,
						needs_booster: false,
					},
				],
				unroutedStudents: [
					{
						id: "student-2",
						name: "Unrouted Student",
						schoolName: "School Two",
						schoolId: "school-2",
					},
				],
				vehicles: [{ id: "vehicle-1", name: "Van One" }],
				staff: [
					{ id: "driver-1", name: "Driver One", capabilities: ["driver"] },
					{ id: "helper-1", name: "Helper One", capabilities: ["helper"] },
				],
				assignments: [],
			}),
		);

		for (const label of [
			"Add route lane",
			"Van One",
			"Driver One",
			"Helper One",
			"Unrouted Student",
			"Move up",
			"Move down",
			"Remove student",
			"Remove lane",
		]) {
			expect(html).toContain(label);
		}
	});

	it("does not render mutation controls for a completed route", () => {
		const html = renderToStaticMarkup(
			createElement(RouteManagementBoard, {
				planId: "plan-1",
				editable: true,
				routes: [
					{
						id: "route-1",
						date: "2026-07-06",
						vehicle_id: "vehicle-1",
						status: "completed",
						run_number: 1,
					},
				],
				stops: [],
				unroutedStudents: [],
				vehicles: [{ id: "vehicle-1", name: "Van One" }],
				staff: [],
				assignments: [],
			}),
		);

		expect(html).not.toContain("Save vehicle");
		expect(html).not.toContain("Remove lane");
	});
});
