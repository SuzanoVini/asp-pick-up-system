import PDFDocument from "pdfkit";
import type { RouteStop } from "@/app/lib/routes/types";
import { buildRoutePdf, buildRoutePdfFilename } from "../route-pdf";

const stop: RouteStop = {
	id: "stop-1",
	routeId: "route-1",
	studentId: "student-1",
	schoolId: "school-1",
	seatNumber: 1,
	orderIndex: 1,
	distanceFromPrevKm: 2.5,
	durationFromPrevMin: 8,
	needsBooster: true,
	studentNameSnapshot: "Sam Student",
	schoolNameSnapshot: "Example School",
	schoolAddressSnapshot: "123 Main Street",
	dismissalTimeSnapshot: "3:00 PM",
};

const baseInput = {
	vehicleName: "Van 1",
	driverName: "Dana Driver",
	helperName: null,
	date: "2026-06-26",
	dayOfWeek: "Friday",
	totalDistanceKm: 2.5,
};

describe("route PDF", () => {
	it("builds PDF buffers with and without plate and responsible staff", async () => {
		const legacyPdf = await buildRoutePdf({ ...baseInput, stops: [stop] });
		const enrichedPdf = await buildRoutePdf({
			...baseInput,
			plateNumber: "ABC 123",
			runNumber: 2,
			stops: [
				{
					...stop,
					responsibleStaffId: "staff-1",
					responsibleStaffNameSnapshot: "Alex Staff",
				},
			],
		});

		for (const pdf of [legacyPdf, enrichedPdf]) {
			expect(pdf.length).toBeGreaterThan(100);
			expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
		}
	});

	it("keeps the legacy run-one filename and distinguishes later runs", () => {
		const input = {
			driverName: "Dana Driver",
			vehicleName: "Van 1",
			date: "2026-06-26",
			dayOfWeek: "Friday",
		};

		const runOne = buildRoutePdfFilename({ ...input, runNumber: 1 });
		const runTwo = buildRoutePdfFilename({ ...input, runNumber: 2 });

		expect(runOne).toBe("Route (Dana Driver) - Van 1 - 2026-06-26 - Friday.pdf");
		expect(runTwo).toBe("Route (Dana Driver) - Van 1 - 2026-06-26 - Friday - Run 2.pdf");
		expect(runTwo).not.toBe(runOne);
	});

	it("measures wrapped rows and repeats the table header after page breaks", async () => {
		const heightSpy = jest.spyOn(PDFDocument.prototype, "heightOfString");
		const textSpy = jest.spyOn(PDFDocument.prototype, "text");
		const longText = "A long value that wraps within a narrow PDF table column. ".repeat(3);

		try {
			await buildRoutePdf({
				...baseInput,
				stops: Array.from({ length: 24 }, (_, index) => ({
					...stop,
					id: `stop-${index}`,
					orderIndex: index + 1,
					studentNameSnapshot: longText,
					schoolAddressSnapshot: longText,
					responsibleStaffNameSnapshot: longText,
				})),
			});

			expect(heightSpy).toHaveBeenCalled();
			expect(textSpy.mock.calls.filter(([text]) => text === "#").length).toBeGreaterThan(1);
		} finally {
			heightSpy.mockRestore();
			textSpy.mockRestore();
		}
	});

	it("caps a maximum-length row so its cells cannot spill onto separate pages", async () => {
		const textSpy = jest.spyOn(PDFDocument.prototype, "text");
		const addPageSpy = jest.spyOn(PDFDocument.prototype, "addPage");
		const longAddress = "123 Very Long Street ".repeat(100).slice(0, 2000);

		try {
			await buildRoutePdf({
				...baseInput,
				totalDistanceKm: null,
				stops: [{ ...stop, schoolAddressSnapshot: longAddress }],
			});

			const addressCall = textSpy.mock.calls.find(([text]) => text === longAddress);
			expect(addressCall).toBeDefined();
			const rowY = addressCall?.[2];
			const rowCalls = textSpy.mock.calls.filter(([, , y]) => y === rowY);
			expect(rowCalls).toHaveLength(8);
			for (const call of rowCalls) {
				expect(call[3]).toEqual(expect.objectContaining({ height: 120, ellipsis: true }));
			}
			expect(addPageSpy).toHaveBeenCalledTimes(1);
		} finally {
			textSpy.mockRestore();
			addPageSpy.mockRestore();
		}
	});

	it("moves the total distance and repeated header to a new page when needed", async () => {
		const heightSpy = jest.spyOn(PDFDocument.prototype, "heightOfString").mockReturnValue(100);
		const textSpy = jest.spyOn(PDFDocument.prototype, "text");
		const addPageSpy = jest.spyOn(PDFDocument.prototype, "addPage");

		try {
			await buildRoutePdf({
				...baseInput,
				stops: Array.from({ length: 5 }, (_, index) => ({
					...stop,
					id: `stop-${index}`,
					orderIndex: index + 1,
				})),
			});

			expect(addPageSpy).toHaveBeenCalledTimes(2);
			expect(textSpy.mock.calls.filter(([text]) => text === "#")).toHaveLength(2);
		} finally {
			heightSpy.mockRestore();
			textSpy.mockRestore();
			addPageSpy.mockRestore();
		}
	});

	it.each([
		0,
		-1,
		1.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.MAX_SAFE_INTEGER + 1,
	])("rejects invalid run number %s", (runNumber) => {
		expect(() =>
			buildRoutePdfFilename({
				driverName: baseInput.driverName,
				vehicleName: baseInput.vehicleName,
				date: baseInput.date,
				dayOfWeek: baseInput.dayOfWeek,
				runNumber,
			}),
		).toThrow("Run number must be a positive safe integer");
	});

	it("rejects an invalid run number when building the PDF", async () => {
		await expect(buildRoutePdf({ ...baseInput, runNumber: 0, stops: [stop] })).rejects.toThrow(
			"Run number must be a positive safe integer",
		);
	});
});
