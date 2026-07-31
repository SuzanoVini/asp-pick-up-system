"use client";

import { useState, useTransition } from "react";
import { downloadPlanPdfs, downloadRoutePdf } from "./route-export-download";

function ExportButton({
	label,
	className,
	download,
}: {
	label: string;
	className: string;
	download: () => Promise<void>;
}) {
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState("");

	return (
		<div>
			<button
				type="button"
				disabled={pending}
				onClick={() =>
					startTransition(async () => {
						setError("");
						try {
							await download();
						} catch (cause) {
							setError(cause instanceof Error ? cause.message : "PDF export failed");
						}
					})
				}
				className={className}
			>
				{pending ? "Exporting…" : label}
			</button>
			{error && <p className="mt-1 text-xs text-red-700">{error}</p>}
		</div>
	);
}

/** Single lane, single PDF. Used by Route History to re-print one past run. */
export function RouteExportButton({ routeId }: { routeId: string }) {
	return (
		<ExportButton
			label="Export PDF"
			className="rounded border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50"
			download={() => downloadRoutePdf(routeId)}
		/>
	);
}

/** The day's commit point: every lane in one zip. */
export function PlanExportButton({ planId }: { planId: string }) {
	return (
		<ExportButton
			label="Export all routes (PDF)"
			className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
			download={() => downloadPlanPdfs(planId)}
		/>
	);
}
