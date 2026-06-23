"use client";

import {
	Archive,
	Building2,
	CalendarClock,
	CalendarDays,
	Car,
	ClipboardList,
	FileText,
	HardHat,
	LayoutDashboard,
	ListOrdered,
	Menu,
	Route,
	School,
	ScrollText,
	Settings,
	UserCheck,
	Users,
	X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";

const navItems = [
	{ href: "/", label: "Dashboard", icon: LayoutDashboard },
	{ href: "/students", label: "Students", icon: Users },
	{ href: "/schools", label: "Schools", icon: School },
	{ href: "/guardians", label: "Guardians", icon: UserCheck },
	{ href: "/enrollments", label: "Enrollments", icon: FileText },
	{ href: "/calendar-rules", label: "Calendar Rules", icon: CalendarDays },
	{ href: "/attendance", label: "Attendance", icon: ClipboardList },
	{ href: "/kids-and-schools", label: "Kids & Schools", icon: Building2 },
	{ href: "/routes", label: "Route Planner", icon: Route },
	{ href: "/vehicles", label: "Vehicles", icon: Car },
	{ href: "/staff", label: "Staff", icon: HardHat },
	{ href: "/staff-schedule", label: "Staff Schedule", icon: CalendarClock },
	{ href: "/waitlist", label: "Waitlist", icon: ListOrdered },
	{ href: "/former-students", label: "Former Students", icon: Archive },
	{ href: "/audit", label: "Audit Log", icon: ScrollText },
	{ href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
	const pathname = usePathname();
	const [mobileOpen, setMobileOpen] = useState(false);

	const isActive = (href: string) => {
		if (href === "/") return pathname === "/";
		return pathname.startsWith(href);
	};

	const nav = (
		<nav className="flex flex-col gap-1 px-3 py-2 overflow-y-auto flex-1">
			{navItems.map((item) => {
				const active = isActive(item.href);
				const Icon = item.icon;
				return (
					<Link
						key={item.href}
						href={item.href}
						onClick={() => setMobileOpen(false)}
						className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
						style={{
							backgroundColor: active ? "var(--color-sidebar-active)" : "transparent",
							color: active ? "var(--color-primary-foreground)" : "var(--color-sidebar-text)",
						}}
					>
						<Icon size={18} />
						<span>{item.label}</span>
					</Link>
				);
			})}
		</nav>
	);

	return (
		<>
			<button
				type="button"
				onClick={() => setMobileOpen(true)}
				className="fixed top-3 left-3 z-50 rounded-md p-2 lg:hidden"
				style={{ backgroundColor: "var(--color-sidebar-bg)", color: "var(--color-sidebar-text)" }}
				aria-label="Open navigation"
			>
				<Menu size={20} />
			</button>

			{mobileOpen && (
				<button
					type="button"
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
					onClick={() => setMobileOpen(false)}
					onKeyDown={(e) => {
						if (e.key === "Escape") setMobileOpen(false);
					}}
					aria-label="Close navigation overlay"
				/>
			)}

			<aside
				className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
					mobileOpen ? "translate-x-0" : "-translate-x-full"
				}`}
				style={{ backgroundColor: "var(--color-sidebar-bg)" }}
			>
				<div className="flex items-center justify-between">
					<Logo />
					<button
						type="button"
						onClick={() => setMobileOpen(false)}
						className="mr-3 rounded-md p-1 lg:hidden"
						style={{ color: "var(--color-sidebar-text)" }}
						aria-label="Close navigation"
					>
						<X size={18} />
					</button>
				</div>
				<div className="mx-3 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />
				{nav}
			</aside>
		</>
	);
}
