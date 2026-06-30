import { exportRoutePdf } from "../actions/route-export";

type ExportResult = Awaited<ReturnType<typeof exportRoutePdf>>;
type ExportRoute = (routeId: string) => Promise<ExportResult>;
type DownloadDocument = {
	createElement(tag: "a"): { href: string; download: string; click(): void };
};

export async function downloadRoutePdf(
	routeId: string,
	exportRoute: ExportRoute = exportRoutePdf,
	documentRef: DownloadDocument = document,
) {
	const result = await exportRoute(routeId);
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
