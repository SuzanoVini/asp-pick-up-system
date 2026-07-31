"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loadCollapsedGroups, saveCollapsedGroups } from "./collapsed-groups-storage";
import { Logo } from "./logo";
import { DAILY_NAV_ITEMS, DASHBOARD_NAV_ITEM, NAV_GROUPS, type NavItem } from "./navigation";

function NavLink({
	item,
	active,
	onNavigate,
}: {
	item: NavItem;
	active: boolean;
	onNavigate: () => void;
}) {
	const Icon = item.icon;
	return (
		<Link
			href={item.href}
			onClick={onNavigate}
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
}

export function Sidebar() {
	const pathname = usePathname();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		const stored = loadCollapsedGroups(window.localStorage);
		if (stored.length > 0) setCollapsedGroupIds(new Set(stored));
	}, []);

	const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

	const toggleGroup = (groupId: string) => {
		setCollapsedGroupIds((current) => {
			const next = new Set(current);
			if (next.has(groupId)) next.delete(groupId);
			else next.add(groupId);
			saveCollapsedGroups(window.localStorage, [...next]);
			return next;
		});
	};

	const closeMobile = () => setMobileOpen(false);

	const nav = (
		<nav className="flex flex-col gap-1 px-3 py-2 overflow-y-auto flex-1">
			<NavLink
				item={DASHBOARD_NAV_ITEM}
				active={isActive(DASHBOARD_NAV_ITEM.href)}
				onNavigate={closeMobile}
			/>
			<div className="mx-1 my-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />
			{DAILY_NAV_ITEMS.map((item) => (
				<NavLink
					key={item.href}
					item={item}
					active={isActive(item.href)}
					onNavigate={closeMobile}
				/>
			))}
			<div className="mx-1 my-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }} />
			{NAV_GROUPS.map((group) => {
				const collapsed = collapsedGroupIds.has(group.id);
				return (
					<div key={group.id}>
						<button
							type="button"
							onClick={() => toggleGroup(group.id)}
							className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
							style={{ color: "var(--color-sidebar-text)" }}
							aria-expanded={!collapsed}
						>
							<span>{group.label}</span>
							<ChevronDown
								size={14}
								style={{ transform: collapsed ? "rotate(-90deg)" : undefined }}
							/>
						</button>
						{!collapsed &&
							group.items.map((item) => (
								<NavLink
									key={item.href}
									item={item}
									active={isActive(item.href)}
									onNavigate={closeMobile}
								/>
							))}
					</div>
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
					onClick={closeMobile}
					onKeyDown={(event) => {
						if (event.key === "Escape") closeMobile();
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
						onClick={closeMobile}
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
