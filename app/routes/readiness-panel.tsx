"use client";

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import type { ReadinessResult } from "@/app/lib/routes/types";

interface ReadinessPanelProps {
	result: ReadinessResult;
}

export function ReadinessPanel({ result }: ReadinessPanelProps) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-sm font-semibold text-gray-900">Export Readiness</h3>
				{result.canExport ? (
					<span className="flex items-center gap-1 text-xs font-medium text-green-700">
						<CheckCircle size={14} /> Ready
					</span>
				) : (
					<span className="flex items-center gap-1 text-xs font-medium text-red-700">
						<XCircle size={14} /> {result.blockerCount} blocker(s)
					</span>
				)}
			</div>
			<ul className="space-y-1.5">
				{result.checks.map((check) => (
					<li
						key={check.name}
						className={`flex items-start gap-2 text-xs ${
							check.passed ? "text-gray-500" : check.severity === "blocker" ? "text-red-700" : "text-amber-700"
						}`}
					>
						{check.passed ? (
							<CheckCircle size={12} className="mt-0.5 shrink-0 text-green-500" />
						) : check.severity === "blocker" ? (
							<XCircle size={12} className="mt-0.5 shrink-0" />
						) : (
							<AlertTriangle size={12} className="mt-0.5 shrink-0" />
						)}
						<span>{check.message}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
