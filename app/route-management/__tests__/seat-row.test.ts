import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SeatRow } from "../seat-row";
import type { SeatRow as SeatRowData } from "../seat-template";

const emptyStudentRow: SeatRowData = {
	kind: "student",
	seatNumber: 2,
	stopId: null,
	occupantName: null,
	schoolName: null,
	needsBooster: false,
	orderIndex: null,
	responsibleStaffId: null,
	responsibleStaffName: null,
	dismissalTime: null,
	schoolAddress: null,
};

const occupiedStudentRow: SeatRowData = {
	kind: "student",
	seatNumber: 1,
	stopId: "stop-1",
	occupantName: "Nori O.",
	schoolName: "Queen Elizabeth",
	needsBooster: true,
	orderIndex: 1,
	responsibleStaffId: null,
	responsibleStaffName: "Jack",
	dismissalTime: "15:00:00",
	schoolAddress: "4102 W 16th Ave",
};

describe("SeatRow", () => {
	it("renders an empty student row as a labeled drop target with a search input", () => {
		const html = renderToStaticMarkup(
			createElement(SeatRow, {
				row: emptyStudentRow,
				routeId: "route-1",
				editable: true,
				armed: false,
				onAssign: () => {},
			}),
		);

		expect(html).toContain('data-seat-number="2"');
		expect(html).toContain('data-seat-kind="student"');
		expect(html).toContain("<input");
	});

	it("renders an occupied row with the student's name, order, address, and a booster badge", () => {
		const html = renderToStaticMarkup(
			createElement(SeatRow, {
				row: occupiedStudentRow,
				routeId: "route-1",
				editable: true,
				armed: false,
				onAssign: () => {},
				onMoveUp: () => {},
				onMoveDown: () => {},
			}),
		);

		expect(html).toContain("Nori O.");
		expect(html).toContain("Queen Elizabeth");
		expect(html).toContain("booster");
		expect(html).toContain("4102 W 16th Ave");
		expect(html).toContain("Move up");
		expect(html).toContain("Move down");
		expect(html).toContain('draggable="true"');
		expect(html).toContain('data-order-index="1"');
	});

	it("renders helper and driver rows even when unoccupied", () => {
		const html = renderToStaticMarkup(
			createElement(SeatRow, {
				row: { kind: "driver", seatNumber: null, occupantStaffName: null },
				routeId: "route-1",
				editable: true,
				armed: false,
				onAssign: () => {},
			}),
		);

		expect(html).toContain('data-seat-kind="driver"');
		expect(html).toContain("open");
	});

	it("shows the assigned staff member on a driver row", () => {
		const html = renderToStaticMarkup(
			createElement(SeatRow, {
				row: { kind: "driver", seatNumber: null, occupantStaffName: "Jack" },
				routeId: "route-1",
				editable: true,
				armed: false,
				onAssign: () => {},
			}),
		);

		expect(html).toContain("Jack");
	});

	it("renders a read-only row without inputs or reorder controls when not editable", () => {
		const html = renderToStaticMarkup(
			createElement(SeatRow, {
				row: emptyStudentRow,
				routeId: "route-1",
				editable: false,
				armed: false,
				onAssign: () => {},
			}),
		);

		expect(html).not.toContain("<input");
		expect(html).not.toContain("Move up");
	});

	it("does not offer reorder controls on a finalized occupied row", () => {
		const html = renderToStaticMarkup(
			createElement(SeatRow, {
				row: occupiedStudentRow,
				routeId: "route-1",
				editable: false,
				armed: false,
				onAssign: () => {},
			}),
		);

		expect(html).toContain("Nori O.");
		expect(html).not.toContain("Move up");
		expect(html).not.toContain('draggable="true"');
	});
});
