import {
	School,
	UserCheck,
	UserX,
	Truck,
	Users,
	AlertCircle,
} from "lucide-react";
import { StatCard } from "./stat-card";

interface TodaySummaryProps {
	schoolsServed: number;
	presentCount: number;
	absentCount: number;
	dropOffCount: number;
	totalExpected: number;
	unroutedCount: number;
}

export function TodaySummary({
	schoolsServed,
	presentCount,
	absentCount,
	dropOffCount,
	totalExpected,
	unroutedCount,
}: TodaySummaryProps) {
	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
			<StatCard
				label="Schools Served"
				value={schoolsServed}
				icon={School}
				color="text-blue-500"
			/>
			<StatCard
				label="Present"
				value={presentCount}
				icon={UserCheck}
				color="text-green-500"
			/>
			<StatCard
				label="Absent"
				value={absentCount}
				icon={UserX}
				color="text-red-500"
			/>
			<StatCard
				label="Drop-off"
				value={dropOffCount}
				icon={Truck}
				color="text-gray-500"
			/>
			<StatCard
				label="Total Expected"
				value={totalExpected}
				icon={Users}
				color="text-indigo-500"
			/>
			<StatCard
				label="Unrouted"
				value={unroutedCount}
				icon={AlertCircle}
				color={unroutedCount > 0 ? "text-red-500" : "text-gray-400"}
			/>
		</div>
	);
}
