import { Bus } from "lucide-react";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "ASP Manager";

export function Logo({ collapsed }: { collapsed?: boolean }) {
	return (
		<div className="flex items-center gap-3 px-4 py-5">
			<div
				className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
				style={{ backgroundColor: "var(--color-primary)" }}
			>
				<Bus size={20} color="var(--color-primary-foreground)" />
			</div>
			{!collapsed && (
				<span className="text-lg font-semibold text-white truncate">{appName}</span>
			)}
		</div>
	);
}
