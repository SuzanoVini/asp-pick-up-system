import type { LucideIcon } from "lucide-react";

interface StatCardProps {
	label: string;
	value: number;
	icon: LucideIcon;
	color?: string;
}

export function StatCard({ label, value, icon: Icon, color = "text-gray-600" }: StatCardProps) {
	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium text-gray-500">{label}</p>
					<p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
				</div>
				<Icon size={32} className={color} />
			</div>
		</div>
	);
}
