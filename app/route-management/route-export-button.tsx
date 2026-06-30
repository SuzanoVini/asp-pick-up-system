"use client";

import { useState, useTransition } from "react";
import { downloadRoutePdf } from "./route-export-download";

export function RouteExportButton({ routeId }: { routeId: string }) {
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
							await downloadRoutePdf(routeId);
						} catch (cause) {
							setError(cause instanceof Error ? cause.message : "PDF export failed");
						}
					})
				}
				className="rounded border border-gray-300 px-2 py-1 text-xs font-medium hover:bg-gray-50"
			>
				{pending ? "Exporting…" : "Export PDF"}
			</button>
			{error && <p className="mt-1 text-xs text-red-700">{error}</p>}
		</div>
	);
}
