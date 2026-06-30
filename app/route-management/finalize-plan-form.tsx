import type { ReadinessResult } from "../lib/routes/types";
import { finalizeRoutePlanFromForm } from "./form-actions";

export function FinalizePlanForm({
	planId,
	readiness,
}: {
	planId: string;
	readiness: ReadinessResult;
}) {
	const warnings = readiness.checks.filter(
		(check) => !check.passed && check.severity === "warning",
	);
	const blockers = readiness.checks.filter(
		(check) => !check.passed && check.severity === "blocker",
	);

	return (
		<form
			action={finalizeRoutePlanFromForm}
			className="rounded-lg border border-gray-200 bg-white p-4"
		>
			<input type="hidden" name="planId" value={planId} />
			{warnings.map((check) => (
				<input key={check.name} type="hidden" name="acknowledgedWarning" value={check.name} />
			))}
			{blockers.map((check) => (
				<input key={check.name} type="hidden" name="overrideCheck" value={check.name} />
			))}
			<h3 className="text-sm font-semibold text-gray-900">Finalize plan</h3>
			<p className="mt-1 text-xs text-gray-500">
				Finalization acknowledges {warnings.length} warning(s)
				{blockers.length > 0 ? ` and overrides ${blockers.length} blocker(s).` : "."}
			</p>
			{blockers.length > 0 && (
				<textarea
					name="overrideReason"
					required
					maxLength={2000}
					placeholder="Reason for blocker override"
					className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-xs"
				/>
			)}
			<button
				type="submit"
				className="mt-2 rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white"
			>
				{blockers.length > 0 ? "Finalize with override" : "Finalize plan"}
			</button>
		</form>
	);
}
