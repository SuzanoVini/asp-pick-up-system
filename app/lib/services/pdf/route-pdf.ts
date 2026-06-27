import PDFDocument from "pdfkit";
import type { RouteStop } from "@/app/lib/routes/types";

interface RoutePdfInput {
	vehicleName: string;
	plateNumber?: string | null;
	runNumber?: number;
	driverName: string | null;
	helperName: string | null;
	date: string;
	dayOfWeek: string;
	stops: RouteStop[];
	totalDistanceKm: number | null;
}

function getRunSuffix(runNumber?: number): string {
	if (runNumber === undefined || runNumber === 1) return "";
	if (!Number.isSafeInteger(runNumber) || runNumber <= 0) {
		throw new Error("Run number must be a positive safe integer");
	}
	return ` - Run ${runNumber}`;
}

export function buildRoutePdfFilename(input: {
	driverName: string | null;
	vehicleName: string;
	date: string;
	dayOfWeek: string;
	runNumber?: number;
}): string {
	const driver = input.driverName ?? "Unassigned";
	const run = getRunSuffix(input.runNumber);
	return `Route (${driver}) - ${input.vehicleName} - ${input.date} - ${input.dayOfWeek}${run}.pdf`;
}

export async function buildRoutePdf(input: RoutePdfInput): Promise<Buffer> {
	const run = getRunSuffix(input.runNumber);
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ size: "LETTER", margin: 50 });
		const chunks: Buffer[] = [];

		doc.on("data", (chunk: Buffer) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		doc.fontSize(16).font("Helvetica-Bold");
		const plate = input.plateNumber ? ` (${input.plateNumber})` : "";
		doc.text(`Route - ${input.vehicleName}${plate}${run}`, { align: "center" });
		doc.moveDown(0.3);

		doc.fontSize(10).font("Helvetica");
		doc.text(`${input.dayOfWeek}, ${input.date}`, { align: "center" });
		doc.moveDown(0.3);

		const driver = input.driverName ?? "Unassigned";
		const helper = input.helperName ?? "None";
		doc.text(`Driver: ${driver}  |  Helper: ${helper}`, { align: "center" });
		doc.moveDown(1);

		const colWidths = {
			order: 26,
			student: 90,
			school: 78,
			address: 105,
			time: 48,
			booster: 38,
			dist: 55,
			staff: 72,
		};
		const startX = 50;
		const colX = {
			order: startX,
			student: startX + colWidths.order,
			school: startX + colWidths.order + colWidths.student,
			address: startX + colWidths.order + colWidths.student + colWidths.school,
			time: startX + colWidths.order + colWidths.student + colWidths.school + colWidths.address,
			booster:
				startX +
				colWidths.order +
				colWidths.student +
				colWidths.school +
				colWidths.address +
				colWidths.time,
			dist:
				startX +
				colWidths.order +
				colWidths.student +
				colWidths.school +
				colWidths.address +
				colWidths.time +
				colWidths.booster,
			staff: startX + 512 - colWidths.staff,
		};
		const renderTableHeader = (headerY: number): number => {
			doc.fontSize(8).font("Helvetica-Bold");
			doc.text("#", colX.order, headerY, { width: colWidths.order });
			doc.text("Student", colX.student, headerY, { width: colWidths.student });
			doc.text("School", colX.school, headerY, { width: colWidths.school });
			doc.text("Address", colX.address, headerY, { width: colWidths.address });
			doc.text("Time", colX.time, headerY, { width: colWidths.time });
			doc.text("Boost", colX.booster, headerY, { width: colWidths.booster });
			doc.text("Dist", colX.dist, headerY, { width: colWidths.dist });
			doc.text("Responsible", colX.staff, headerY, { width: colWidths.staff });

			const lineY = headerY + 15;
			doc
				.moveTo(startX, lineY)
				.lineTo(startX + 512, lineY)
				.stroke();
			doc.font("Helvetica").fontSize(8);
			return lineY + 5;
		};
		const MAX_ROW_HEIGHT = 120;
		const getRowHeight = (cells: Array<{ text: string; width: number }>): number =>
			Math.min(
				Math.max(...cells.map((cell) => doc.heightOfString(cell.text, { width: cell.width }))) + 4,
				MAX_ROW_HEIGHT,
			);

		let y = renderTableHeader(doc.y);

		for (const stop of input.stops) {
			const cells = [
				{ text: String(stop.orderIndex), x: colX.order, width: colWidths.order },
				{ text: stop.studentNameSnapshot, x: colX.student, width: colWidths.student },
				{ text: stop.schoolNameSnapshot, x: colX.school, width: colWidths.school },
				{ text: stop.schoolAddressSnapshot ?? "", x: colX.address, width: colWidths.address },
				{ text: stop.dismissalTimeSnapshot ?? "", x: colX.time, width: colWidths.time },
				{ text: stop.needsBooster ? "Yes" : "", x: colX.booster, width: colWidths.booster },
				{
					text: stop.distanceFromPrevKm !== null ? `${stop.distanceFromPrevKm} km` : "",
					x: colX.dist,
					width: colWidths.dist,
				},
				{
					text: stop.responsibleStaffNameSnapshot ?? "",
					x: colX.staff,
					width: colWidths.staff,
				},
			];
			const rowHeight = getRowHeight(cells);
			if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
				doc.addPage();
				y = renderTableHeader(doc.page.margins.top);
			}

			for (const cell of cells) {
				doc.text(cell.text, cell.x, y, {
					width: cell.width,
					height: rowHeight,
					ellipsis: true,
				});
			}
			y += rowHeight;
		}

		if (input.totalDistanceKm !== null) {
			const totalText = `Total Distance: ${input.totalDistanceKm} km`;
			doc.font("Helvetica-Bold").fontSize(9);
			const totalHeight = doc.heightOfString(totalText, { width: 512 });
			y += 10;
			if (y + totalHeight > doc.page.height - doc.page.margins.bottom) {
				doc.addPage();
				y = renderTableHeader(doc.page.margins.top) + 10;
				doc.font("Helvetica-Bold").fontSize(9);
			}
			doc.text(totalText, startX, y, { width: 512 });
		}

		doc.end();
	});
}
