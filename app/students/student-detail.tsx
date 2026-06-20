"use client";

import { differenceInYears } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/app/components/ui/status-badge";

interface StudentDetailProps {
	student: {
		id: string;
		name: string;
		school_id: string | null;
		date_of_birth: string | null;
		home_address: string | null;
		drop_off_only: boolean;
		dismissal_time: string | null;
		early_dismissal_time: string | null;
		first_pickup_date: string | null;
		status: string;
		comments_pickup: string | null;
		comments_dropoff: string | null;
	};
	school?: { name: string } | null;
	guardians: {
		id: string;
		name: string;
		phone: string | null;
		email: string | null;
		is_primary: boolean;
	}[];
	enrollments: {
		id: string;
		start_date: string;
		end_date: string | null;
		contract_days: string[];
		status: string;
	}[];
	onBack: () => void;
}

export function StudentDetail({
	student,
	school,
	guardians,
	enrollments,
	onBack,
}: StudentDetailProps) {
	const age = student.date_of_birth
		? differenceInYears(new Date(), new Date(student.date_of_birth))
		: null;
	const needsBooster = age !== null && age < 9;

	return (
		<div>
			<button
				type="button"
				onClick={onBack}
				className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
			>
				<ArrowLeft size={16} /> Back to list
			</button>
			<div className="rounded-lg border border-gray-200 bg-white p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-bold">{student.name}</h2>
					<div className="flex items-center gap-2">
						<StatusBadge status={student.status} />
						{student.drop_off_only && <StatusBadge status="D" type="attendance" />}
						{needsBooster && (
							<span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
								Booster Required
							</span>
						)}
					</div>
				</div>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<h3 className="mb-2 text-sm font-semibold text-gray-500 uppercase">Details</h3>
						<dl className="space-y-2 text-sm">
							<div>
								<dt className="text-gray-500">School</dt>
								<dd>{school?.name ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-gray-500">Date of Birth</dt>
								<dd>
									{student.date_of_birth ?? "-"}
									{age !== null ? ` (age ${age})` : ""}
								</dd>
							</div>
							<div>
								<dt className="text-gray-500">Home Address</dt>
								<dd>{student.home_address ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-gray-500">Dismissal Time Override</dt>
								<dd>{student.dismissal_time ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-gray-500">ED Time Override</dt>
								<dd>{student.early_dismissal_time ?? "-"}</dd>
							</div>
							<div>
								<dt className="text-gray-500">First Pickup</dt>
								<dd>{student.first_pickup_date ?? "-"}</dd>
							</div>
							{student.comments_pickup && (
								<div>
									<dt className="text-gray-500">Pickup Comments</dt>
									<dd>{student.comments_pickup}</dd>
								</div>
							)}
							{student.comments_dropoff && (
								<div>
									<dt className="text-gray-500">Drop-off Comments</dt>
									<dd>{student.comments_dropoff}</dd>
								</div>
							)}
						</dl>
					</div>

					<div>
						<h3 className="mb-2 text-sm font-semibold text-gray-500 uppercase">Guardians</h3>
						{guardians.length === 0 ? (
							<p className="text-sm text-gray-400">No guardians linked.</p>
						) : (
							<ul className="space-y-2">
								{guardians.map((g) => (
									<li key={g.id} className="rounded border border-gray-100 p-2 text-sm">
										<div className="font-medium">
											{g.name}{" "}
											{g.is_primary && <span className="text-xs text-gray-400">(Primary)</span>}
										</div>
										{g.phone && <div className="text-gray-500">{g.phone}</div>}
										{g.email && <div className="text-gray-500">{g.email}</div>}
									</li>
								))}
							</ul>
						)}

						<h3 className="mb-2 mt-6 text-sm font-semibold text-gray-500 uppercase">Enrollments</h3>
						{enrollments.length === 0 ? (
							<p className="text-sm text-gray-400">No enrollments.</p>
						) : (
							<ul className="space-y-2">
								{enrollments.map((e) => (
									<li key={e.id} className="rounded border border-gray-100 p-2 text-sm">
										<div className="flex items-center justify-between">
											<span className="font-medium">{e.contract_days.join(", ")}</span>
											<StatusBadge status={e.status} />
										</div>
										<div className="text-xs text-gray-500">
											{e.start_date} - {e.end_date ?? "ongoing"}
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
