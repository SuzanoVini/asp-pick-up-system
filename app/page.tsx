import { format } from "date-fns";

export default function DashboardPage() {
	const today = new Date();

	const placeholderStats = [
		{ label: "Schools Served", value: "--" },
		{ label: "Present", value: "--" },
		{ label: "Absent", value: "--" },
		{ label: "Drop-off Only", value: "--" },
		{ label: "Total Expected", value: "--" },
		{ label: "Unrouted", value: "--" },
	];

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Today</h2>
					<p style={{ color: "var(--color-muted)" }}>
						{format(today, "EEEE, MMMM d, yyyy")}
					</p>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
				{placeholderStats.map((stat) => (
					<div
						key={stat.label}
						className="rounded-lg border p-4"
						style={{
							backgroundColor: "white",
							borderColor: "#e5e7eb",
						}}
					>
						<p className="text-sm" style={{ color: "var(--color-muted)" }}>
							{stat.label}
						</p>
						<p className="mt-1 text-2xl font-semibold">{stat.value}</p>
					</div>
				))}
			</div>

			<div
				className="mt-8 rounded-lg border p-8 text-center"
				style={{
					backgroundColor: "white",
					borderColor: "#e5e7eb",
					color: "var(--color-muted)",
				}}
			>
				<p>Attendance preview and quick actions will be available in a future update.</p>
			</div>
		</div>
	);
}
