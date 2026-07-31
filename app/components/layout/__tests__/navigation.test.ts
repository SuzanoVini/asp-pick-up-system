import { DAILY_NAV_ITEMS, DASHBOARD_NAV_ITEM, NAV_GROUPS, navItems } from "../navigation";

describe("navigation grouping", () => {
	it("accounts for every nav item exactly once across dashboard, daily, and groups", () => {
		const grouped = [
			DASHBOARD_NAV_ITEM,
			...DAILY_NAV_ITEMS,
			...NAV_GROUPS.flatMap((group) => group.items),
		];
		expect(grouped.map((item) => item.href).sort()).toEqual(
			[...navItems.map((item) => item.href)].sort(),
		);
		expect(new Set(grouped.map((item) => item.href)).size).toBe(navItems.length);
	});

	it("keeps Route Management, Calendar Rules, and Attendance flat in Daily", () => {
		expect(DAILY_NAV_ITEMS.map((item) => item.href)).toEqual([
			"/route-management",
			"/calendar-rules",
			"/attendance",
		]);
	});

	it("places every group item under exactly one named group", () => {
		const groupIds = NAV_GROUPS.map((group) => group.id);
		expect(groupIds).toEqual(["records", "fleet-staff", "admin"]);
		expect(
			NAV_GROUPS.find((group) => group.id === "records")?.items.map((item) => item.href),
		).toEqual(
			expect.arrayContaining([
				"/students",
				"/schools",
				"/guardians",
				"/enrollments",
				"/kids-and-schools",
				"/waitlist",
				"/former-students",
			]),
		);
		expect(
			NAV_GROUPS.find((group) => group.id === "admin")?.items.map((item) => item.href),
		).toEqual(expect.arrayContaining(["/settings", "/audit", "/route-history"]));
	});
});
