import {
	Archive,
	Backpack,
	CalendarClock,
	CalendarDays,
	Car,
	ClipboardList,
	FileText,
	HardHat,
	History,
	LayoutDashboard,
	ListOrdered,
	Route,
	School,
	ScrollText,
	Settings,
	UserCheck,
	Users,
} from "lucide-react";

export interface NavItem {
	href: string;
	label: string;
	icon: typeof LayoutDashboard;
}

export interface NavGroup {
	id: string;
	label: string;
	items: NavItem[];
}

export const DASHBOARD_NAV_ITEM: NavItem = { href: "/", label: "Dashboard", icon: LayoutDashboard };

export const DAILY_NAV_ITEMS: NavItem[] = [
	{ href: "/route-management", label: "Route Management", icon: Route },
	{ href: "/calendar-rules", label: "Calendar Rules", icon: CalendarDays },
	{ href: "/attendance", label: "Attendance", icon: ClipboardList },
];

export const NAV_GROUPS: NavGroup[] = [
	{
		id: "records",
		label: "Records",
		items: [
			{ href: "/students", label: "Students", icon: Users },
			{ href: "/schools", label: "Schools", icon: School },
			{ href: "/guardians", label: "Guardians", icon: UserCheck },
			{ href: "/enrollments", label: "Enrollments", icon: FileText },
			{ href: "/kids-and-schools", label: "Kids & Schools", icon: Backpack },
			{ href: "/waitlist", label: "Waitlist", icon: ListOrdered },
			{ href: "/former-students", label: "Former Students", icon: Archive },
		],
	},
	{
		id: "fleet-staff",
		label: "Fleet & Staff",
		items: [
			{ href: "/vehicles", label: "Vehicles", icon: Car },
			{ href: "/staff", label: "Staff", icon: HardHat },
			{ href: "/staff-schedule", label: "Staff Schedule", icon: CalendarClock },
		],
	},
	{
		id: "admin",
		label: "Admin",
		items: [
			{ href: "/settings", label: "Settings", icon: Settings },
			{ href: "/audit", label: "Audit Log", icon: ScrollText },
			{ href: "/route-history", label: "Route History", icon: History },
		],
	},
];

export const navItems: NavItem[] = [
	DASHBOARD_NAV_ITEM,
	...DAILY_NAV_ITEMS,
	...NAV_GROUPS.flatMap((group) => group.items),
];
