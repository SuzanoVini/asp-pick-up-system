import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RouteManagementBoard } from "../route-management-board";

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: jest.fn() }) }));
jest.mock("../../actions/route-management", () => ({
	addRouteTable: jest.fn(),
	assignSchoolGroup: jest.fn(),
	assignStudent: jest.fn(),
	moveStudentStop: jest.fn(),
	removeRouteTable: jest.fn(),
	removeStudentStop: jest.fn(),
	reorderRouteStops: jest.fn(),
	repositionRouteStopSeatAction: jest.fn(),
	setRouteStaff: jest.fn(),
	setRouteVehicle: jest.fn(),
}));

const vehicle = {
	id: "vehicle-1",
	name: "Van One",
	kids_seats: 3,
	booster_seats: 1,
	license_plate: "ABC 123",
};

describe("RouteManagementBoard", () => {
	it("renders one row per vehicle seat plus helper and driver rows", () => {
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
				vehicles: [vehicle],
				staff: [
					{ id: "driver-1", name: "Driver One", capabilities: ["driver"] },
					{ id: "helper-1", name: "Helper One", capabilities: ["helper"] },
				],
				assignments: [],
			}),
		);

		// Every templated seat renders, occupied or not.
		expect(html).toContain('data-seat-number="1"');
		expect(html).toContain('data-seat-number="2"');
		expect(html).toContain('data-seat-number="3"');
		expect(html).not.toContain('data-seat-number="4"');
		expect(html).toContain('data-seat-kind="helper"');
		expect(html).toContain('data-seat-kind="driver"');

		for (const label of [
			"Add route lane",
			"Remove lane",
			"Van One",
			"Driver One",
			"Helper One",
			"Assigned Student",
			"School One",
			"Unrouted Student",
			"Move up",
			"Move down",
		]) {
			expect(html).toContain(label);
		}
	});

	it("renders the seat template for a lane with no vehicle without crashing", () => {
		const html = renderToStaticMarkup(
			createElement(RouteManagementBoard, {
				planId: "plan-1",
				editable: true,
				routes: [
					{
						id: "route-1",
						date: "2026-07-06",
						vehicle_id: null,
						status: "draft",
						run_number: 1,
					},
				],
				stops: [],
				unroutedStudents: [],
				vehicles: [vehicle],
				staff: [],
				assignments: [],
			}),
		);

		expect(html).toContain('data-seat-kind="driver"');
		expect(html).not.toContain('data-seat-number="1"');
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
				unroutedStudents: [],
				vehicles: [vehicle],
				staff: [],
				assignments: [],
			}),
		);

		// Seats stay visible, but read-only.
		expect(html).toContain('data-seat-number="1"');
		expect(html).toContain("Assigned Student");
		expect(html).not.toContain("Remove lane");
		expect(html).not.toContain('aria-label="Vehicle"');
		expect(html).not.toContain("Move up");
		expect(html).not.toContain("<input");
	});
});
