"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
	"/": "Dashboard",
	"/students": "Students",
	"/schools": "Schools",
	"/guardians": "Guardians",
	"/enrollments": "Enrollments",
	"/calendar-rules": "Calendar Rules",
	"/attendance": "Attendance",
	"/kids-and-schools": "Kids & Schools",
	"/routes": "Route Planner",
	"/vehicles": "Vehicles",
	"/staff": "Staff",
	"/staff-schedule": "Staff Schedule",
	"/waitlist": "Waitlist",
	"/former-students": "Former Students",
	"/audit": "Audit Log",
};

export function Header() {
	const pathname = usePathname();

	const title =
		pageTitles[pathname] ||
		Object.entries(pageTitles).find(([path]) => path !== "/" && pathname.startsWith(path))?.[1] ||
		"";

	return (
		<header
			className="flex h-14 items-center border-b px-6 lg:px-8"
			style={{ borderColor: "#e5e7eb" }}
		>
			<h1 className="text-lg font-semibold pl-10 lg:pl-0">{title}</h1>
		</header>
	);
}
