import { exportPlanPdfs, exportRoutePdf } from "../actions/route-export";

type ExportResult = Awaited<ReturnType<typeof exportRoutePdf>>;
type ExportRoute = (routeId: string) => Promise<ExportResult>;
type ExportPlan = (planId: string) => Promise<ExportResult>;
type DownloadDocument = {
	createElement(tag: "a"): { href: string; download: string; click(): void };
};

function save(result: ExportResult, documentRef: DownloadDocument) {
	const url = URL.createObjectURL(
		new Blob([Uint8Array.from(result.buffer)], { type: result.contentType }),
	);
	try {
		const anchor = documentRef.createElement("a");
		anchor.href = url;
		anchor.download = result.filename;
		anchor.click();
	} finally {
		URL.revokeObjectURL(url);
	}
}

export async function downloadRoutePdf(
	routeId: string,
	exportRoute: ExportRoute = exportRoutePdf,
	documentRef: DownloadDocument = document,
) {
	save(await exportRoute(routeId), documentRef);
}

/** One click, one zip: every lane of the day's plan as its own PDF inside it. */
export async function downloadPlanPdfs(
	planId: string,
	exportPlan: ExportPlan = exportPlanPdfs,
	documentRef: DownloadDocument = document,
) {
	save(await exportPlan(planId), documentRef);
}
