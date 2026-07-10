"use client";

type RuleVisualStatus = "expired" | "active" | "upcoming" | "inactive";

interface RuleStatusIndicatorProps {
	endDate: string;
	startDate: string;
	isActive: boolean;
}

function getRuleVisualStatus(
	startDate: string,
	endDate: string,
	isActive: boolean,
): RuleVisualStatus {
	if (!isActive) return "inactive";
	// Browser-local calendar day; toISOString() would roll to tomorrow after 4pm Pacific.
	const today = new Intl.DateTimeFormat("en-CA").format(new Date());
	if (endDate < today) return "expired";
	if (startDate > today) return "upcoming";
	return "active";
}

const statusStyles: Record<RuleVisualStatus, { bg: string; text: string; label: string }> = {
	expired: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Expired" },
	active: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Active" },
	upcoming: { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Upcoming" },
	inactive: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", label: "Inactive" },
};

export function RuleStatusIndicator({ endDate, startDate, isActive }: RuleStatusIndicatorProps) {
	const status = getRuleVisualStatus(startDate, endDate, isActive);
	const style = statusStyles[status];

	return (
		<span
			className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
		>
			{style.label}
		</span>
	);
}

export type { RuleVisualStatus };
export { getRuleVisualStatus };
