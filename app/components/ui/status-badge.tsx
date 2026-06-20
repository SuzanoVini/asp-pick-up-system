const attendanceColors: Record<string, { bg: string; text: string }> = {
	P: { bg: "bg-green-100", text: "text-green-800" },
	A: { bg: "bg-red-100", text: "text-red-800" },
	N: { bg: "bg-blue-100", text: "text-blue-800" },
	E: { bg: "bg-yellow-100", text: "text-yellow-800" },
	ED: { bg: "bg-purple-100", text: "text-purple-800" },
	D: { bg: "bg-gray-100", text: "text-gray-800" },
};

const entityColors: Record<string, { bg: string; text: string }> = {
	active: { bg: "bg-green-100", text: "text-green-800" },
	pending: { bg: "bg-yellow-100", text: "text-yellow-800" },
	former: { bg: "bg-gray-100", text: "text-gray-600" },
	inactive: { bg: "bg-gray-100", text: "text-gray-600" },
	cancelled: { bg: "bg-red-100", text: "text-red-800" },
	waiting: { bg: "bg-blue-100", text: "text-blue-800" },
	offered: { bg: "bg-indigo-100", text: "text-indigo-800" },
	enrolled: { bg: "bg-green-100", text: "text-green-800" },
	declined: { bg: "bg-gray-100", text: "text-gray-600" },
};

const attendanceLabels: Record<string, string> = {
	P: "Present",
	A: "Absent",
	N: "Not Scheduled",
	E: "Extra",
	ED: "Early Dismissal",
	D: "Drop-off",
};

interface StatusBadgeProps {
	status: string;
	type?: "attendance" | "entity";
}

export function StatusBadge({ status, type = "entity" }: StatusBadgeProps) {
	const colors = type === "attendance" ? attendanceColors : entityColors;
	const style = colors[status] ?? { bg: "bg-gray-100", text: "text-gray-800" };
	const label = type === "attendance" ? (attendanceLabels[status] ?? status) : status;

	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style.bg} ${style.text}`}
		>
			{label}
		</span>
	);
}
