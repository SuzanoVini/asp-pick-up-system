import {
	AlertTriangle,
	CalendarDays,
	Car,
	CheckCircle2,
	Download,
	FileText,
	MapPin,
	Route,
	User,
	Users,
} from "lucide-react";

const workflowSteps = [
	{ label: "Rules", status: "done" },
	{ label: "Attendance", status: "done" },
	{ label: "Pickup List", status: "done" },
	{ label: "Route Board", status: "active" },
	{ label: "Export", status: "pending" },
	{ label: "History", status: "pending" },
];

const pickupPool = [
	{ name: "Maya Chen", school: "Maple Ridge Elementary", time: "3:00 PM", booster: true },
	{ name: "Noah Patel", school: "Maple Ridge Elementary", time: "3:00 PM", booster: false },
	{ name: "Emma Silva", school: "Cedar Grove School", time: "3:15 PM", booster: true },
	{ name: "Lucas Brown", school: "Cedar Grove School", time: "3:15 PM", booster: false },
];

const vehicleRoutes = [
	{
		name: "Van 1",
		driver: "Vinicius Gomes",
		helper: "Amanda Lee",
		seats: "4/12",
		boosters: "2/5",
		distance: "8.6 km",
		stops: [
			{
				order: 1,
				type: "driver",
				name: "Vinicius Gomes",
				school: "Start / staff pickup",
				time: "2:30 PM",
			},
			{
				order: 2,
				type: "school",
				name: "Maya Chen",
				school: "Maple Ridge Elementary",
				time: "3:00 PM",
			},
			{
				order: 3,
				type: "school",
				name: "Noah Patel",
				school: "Maple Ridge Elementary",
				time: "3:00 PM",
			},
			{
				order: 4,
				type: "school",
				name: "Emma Silva",
				school: "Cedar Grove School",
				time: "3:15 PM",
			},
			{
				order: 5,
				type: "school",
				name: "Lucas Brown",
				school: "Cedar Grove School",
				time: "3:15 PM",
			},
		],
	},
	{
		name: "Van 2",
		driver: "Chris Morgan",
		helper: "Sofia Ramos",
		seats: "3/8",
		boosters: "1/5",
		distance: "6.2 km",
		stops: [
			{
				order: 1,
				type: "driver",
				name: "Chris Morgan",
				school: "Start / staff pickup",
				time: "2:35 PM",
			},
			{
				order: 2,
				type: "school",
				name: "Liam Walker",
				school: "Northview Academy",
				time: "3:05 PM",
			},
			{
				order: 3,
				type: "school",
				name: "Sofia Martins",
				school: "Northview Academy",
				time: "3:05 PM",
			},
			{ order: 4, type: "school", name: "Aiden Kim", school: "Brookside School", time: "3:20 PM" },
		],
	},
];

const historyRoutes = [
	{
		name: "Van 1",
		status: "exported",
		created: "Jun 26, 2026 1:42 PM",
		exported: "Jun 26, 2026 2:18 PM",
		driver: "Vinicius Gomes",
		helper: "Amanda Lee",
		vehicle: "Van 1 - ABC-1234",
		stops: vehicleRoutes[0].stops,
	},
	{
		name: "Van 2",
		status: "exported",
		created: "Jun 26, 2026 1:46 PM",
		exported: "Jun 26, 2026 2:20 PM",
		driver: "Chris Morgan",
		helper: "Sofia Ramos",
		vehicle: "Van 2 - DEF-5678",
		stops: vehicleRoutes[1].stops,
	},
];

export default function RouteHistoryPreviewPage() {
	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div>
					<p className="text-sm font-medium text-gray-500">Local workflow preview</p>
					<h1 className="text-2xl font-bold text-gray-950">Route Builder And History</h1>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<input
						type="date"
						defaultValue="2026-06-26"
						className="h-9 rounded-md border border-gray-300 px-3 text-sm"
					/>
					<button
						type="button"
						className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--color-primary)] px-3 text-sm font-medium text-white"
					>
						<CalendarDays size={16} />
						View Date
					</button>
				</div>
			</div>

			<section className="rounded-lg border border-gray-200 bg-white p-4">
				<div className="grid gap-2 md:grid-cols-6">
					{workflowSteps.map((step) => (
						<div
							key={step.label}
							className={`rounded-md border px-3 py-2 text-sm ${
								step.status === "active"
									? "border-indigo-300 bg-indigo-50 text-indigo-800"
									: step.status === "done"
										? "border-green-200 bg-green-50 text-green-800"
										: "border-gray-200 bg-gray-50 text-gray-500"
							}`}
						>
							<div className="flex items-center justify-between gap-2">
								<span className="font-medium">{step.label}</span>
								{step.status === "done" ? <CheckCircle2 size={15} /> : null}
							</div>
						</div>
					))}
				</div>
			</section>

			<section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
				<div className="rounded-lg border border-gray-200 bg-white">
					<div className="border-b border-gray-100 px-4 py-3">
						<div className="flex items-center gap-2">
							<Users size={16} className="text-gray-600" />
							<h2 className="font-semibold text-gray-950">Pickup List</h2>
						</div>
					</div>
					<div className="divide-y divide-gray-100">
						{pickupPool.map((student) => (
							<div key={student.name} className="px-4 py-3">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-medium text-gray-950">{student.name}</p>
										<p className="mt-0.5 text-xs text-gray-500">{student.school}</p>
									</div>
									<span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
										{student.time}
									</span>
								</div>
								{student.booster ? (
									<p className="mt-2 text-xs font-medium text-amber-700">Booster needed</p>
								) : null}
							</div>
						))}
					</div>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					{vehicleRoutes.map((route) => (
						<div key={route.name} className="rounded-lg border border-gray-200 bg-white">
							<div className="border-b border-gray-100 px-4 py-3">
								<div className="flex items-center justify-between gap-3">
									<div className="flex items-center gap-2">
										<Car size={16} className="text-gray-600" />
										<h2 className="font-semibold text-gray-950">{route.name}</h2>
									</div>
									<span className="rounded bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
										{route.seats} seats
									</span>
								</div>
								<div className="mt-2 grid gap-2 text-xs text-gray-600 sm:grid-cols-2">
									<span className="flex items-center gap-1">
										<User size={13} /> {route.driver}
									</span>
									<span>{route.helper}</span>
									<span>{route.boosters} boosters</span>
									<span>{route.distance}</span>
								</div>
							</div>
							<div className="divide-y divide-gray-100">
								{route.stops.map((stop) => (
									<div key={`${route.name}-${stop.order}`} className="flex gap-3 px-4 py-3">
										<div
											className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
												stop.type === "driver"
													? "bg-indigo-100 text-indigo-700"
													: "bg-gray-100 text-gray-700"
											}`}
										>
											{stop.order}
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium text-gray-950">{stop.name}</p>
											<p className="mt-0.5 truncate text-xs text-gray-500">{stop.school}</p>
										</div>
										<span className="text-xs text-gray-500">{stop.time}</span>
									</div>
								))}
							</div>
						</div>
					))}
				</div>

				<div className="space-y-4">
					<div className="rounded-lg border border-gray-200 bg-white p-4">
						<div className="flex items-center gap-2">
							<CheckCircle2 size={16} className="text-green-600" />
							<h2 className="font-semibold text-gray-950">Readiness</h2>
						</div>
						<div className="mt-4 space-y-2 text-sm">
							<p className="flex items-center justify-between">
								<span>All students assigned</span>
								<span className="font-medium text-green-700">Pass</span>
							</p>
							<p className="flex items-center justify-between">
								<span>Drivers selected</span>
								<span className="font-medium text-green-700">Pass</span>
							</p>
							<p className="flex items-center justify-between">
								<span>Helpers selected</span>
								<span className="font-medium text-green-700">Pass</span>
							</p>
							<p className="flex items-center justify-between">
								<span>Capacity</span>
								<span className="font-medium text-green-700">Pass</span>
							</p>
							<p className="flex items-center justify-between">
								<span>Address warnings</span>
								<span className="font-medium text-amber-700">1 warning</span>
							</p>
						</div>
					</div>

					<div className="rounded-lg border border-gray-200 bg-white p-4">
						<div className="flex items-center gap-2">
							<FileText size={16} className="text-gray-600" />
							<h2 className="font-semibold text-gray-950">Final Route</h2>
						</div>
						<div className="mt-4 space-y-2">
							<button
								type="button"
								className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-3 text-sm font-medium text-white"
							>
								<Download size={16} />
								Export PDFs
							</button>
							<button
								type="button"
								className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium text-gray-700"
							>
								<Route size={16} />
								Finalize Routes
							</button>
						</div>
					</div>
				</div>
			</section>

			<section className="rounded-lg border border-gray-200 bg-white">
				<div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<h2 className="font-semibold text-gray-950">Route History Snapshot</h2>
						<p className="text-sm text-gray-500">Friday, June 26, 2026</p>
					</div>
					<div className="flex flex-wrap gap-2 text-xs">
						<span className="rounded bg-green-50 px-2 py-1 font-medium text-green-700">
							2 exported routes
						</span>
						<span className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-600">
							7 students
						</span>
						<span className="rounded bg-gray-100 px-2 py-1 font-medium text-gray-600">14.8 km</span>
					</div>
				</div>

				<div className="grid gap-4 p-4 xl:grid-cols-2">
					{historyRoutes.map((route) => (
						<div key={route.name} className="rounded-lg border border-gray-200">
							<div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
								<div className="flex items-center justify-between gap-3">
									<div>
										<h3 className="font-semibold text-gray-950">{route.vehicle}</h3>
										<p className="mt-1 text-xs text-gray-500">
											Created {route.created} · Exported {route.exported}
										</p>
									</div>
									<span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
										{route.status}
									</span>
								</div>
								<div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
									<span>Driver: {route.driver}</span>
									<span>Helper: {route.helper}</span>
								</div>
							</div>
							<div className="divide-y divide-gray-100">
								{route.stops.map((stop) => (
									<div
										key={`${route.name}-history-${stop.order}`}
										className="grid gap-2 px-4 py-3 md:grid-cols-[40px_1fr_auto]"
									>
										<div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
											{stop.order}
										</div>
										<div className="min-w-0">
											<p className="text-sm font-medium text-gray-950">{stop.name}</p>
											<p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
												<MapPin size={12} />
												{stop.school}
											</p>
										</div>
										<div className="text-left text-xs text-gray-500 md:text-right">
											<p>{stop.time}</p>
											{stop.type === "driver" ? <p>first stop</p> : null}
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</section>

			<section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
				<div className="flex gap-3">
					<AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
					<div>
						<h2 className="font-semibold text-amber-900">Preview data</h2>
						<p className="mt-1 text-sm text-amber-800">
							This localhost screen uses static sample data to preview the planned route-board and
							route-history experience.
						</p>
					</div>
				</div>
			</section>
		</div>
	);
}
