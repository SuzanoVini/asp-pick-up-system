import PDFDocument from "pdfkit";
import type { RouteStop } from "@/app/lib/routes/types";

interface RoutePdfInput {
	vehicleName: string;
	driverName: string | null;
	helperName: string | null;
	date: string;
	dayOfWeek: string;
	stops: RouteStop[];
	totalDistanceKm: number | null;
}

export function buildRoutePdfFilename(input: {
	driverName: string | null;
	vehicleName: string;
	date: string;
	dayOfWeek: string;
}): string {
	const driver = input.driverName ?? "Unassigned";
	return `Route (${driver}) - ${input.vehicleName} - ${input.date} - ${input.dayOfWeek}.pdf`;
}

export async function buildRoutePdf(input: RoutePdfInput): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ size: "LETTER", margin: 50 });
		const chunks: Buffer[] = [];

		doc.on("data", (chunk: Buffer) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		doc.fontSize(16).font("Helvetica-Bold");
		doc.text(`Route - ${input.vehicleName}`, { align: "center" });
		doc.moveDown(0.3);

		doc.fontSize(10).font("Helvetica");
		doc.text(
			`${input.dayOfWeek}, ${input.date}`,
			{ align: "center" },
		);
		doc.moveDown(0.3);

		const driver = input.driverName ?? "Unassigned";
		const helper = input.helperName ?? "None";
		doc.text(`Driver: ${driver}  |  Helper: ${helper}`, { align: "center" });
		doc.moveDown(1);

		const colWidths = { order: 30, student: 120, school: 120, address: 130, time: 55, booster: 45, dist: 50 };
		const startX = 50;
		let y = doc.y;

		doc.fontSize(8).font("Helvetica-Bold");
		doc.text("#", startX, y, { width: colWidths.order });
		doc.text("Student", startX + colWidths.order, y, { width: colWidths.student });
		doc.text("School", startX + colWidths.order + colWidths.student, y, { width: colWidths.school });
		doc.text("Address", startX + colWidths.order + colWidths.student + colWidths.school, y, { width: colWidths.address });
		doc.text("Time", startX + colWidths.order + colWidths.student + colWidths.school + colWidths.address, y, { width: colWidths.time });
		doc.text("Boost", startX + colWidths.order + colWidths.student + colWidths.school + colWidths.address + colWidths.time, y, { width: colWidths.booster });
		doc.text("Dist", startX + colWidths.order + colWidths.student + colWidths.school + colWidths.address + colWidths.time + colWidths.booster, y, { width: colWidths.dist });

		y += 15;
		doc.moveTo(startX, y).lineTo(startX + 550, y).stroke();
		y += 5;

		doc.font("Helvetica").fontSize(8);

		for (const stop of input.stops) {
			if (y > 700) {
				doc.addPage();
				y = 50;
			}

			doc.text(String(stop.orderIndex), startX, y, { width: colWidths.order });
			doc.text(stop.studentNameSnapshot, startX + colWidths.order, y, { width: colWidths.student });
			doc.text(stop.schoolNameSnapshot, startX + colWidths.order + colWidths.student, y, { width: colWidths.school });
			doc.text(stop.schoolAddressSnapshot ?? "", startX + colWidths.order + colWidths.student + colWidths.school, y, { width: colWidths.address });
			doc.text(stop.dismissalTimeSnapshot ?? "", startX + colWidths.order + colWidths.student + colWidths.school + colWidths.address, y, { width: colWidths.time });
			doc.text(stop.needsBooster ? "Yes" : "", startX + colWidths.order + colWidths.student + colWidths.school + colWidths.address + colWidths.time, y, { width: colWidths.booster });
			doc.text(stop.distanceFromPrevKm !== null ? `${stop.distanceFromPrevKm} km` : "", startX + colWidths.order + colWidths.student + colWidths.school + colWidths.address + colWidths.time + colWidths.booster, y, { width: colWidths.dist });

			y += 14;
		}

		if (input.totalDistanceKm !== null) {
			y += 10;
			doc.font("Helvetica-Bold").fontSize(9);
			doc.text(`Total Distance: ${input.totalDistanceKm} km`, startX, y);
		}

		doc.end();
	});
}
