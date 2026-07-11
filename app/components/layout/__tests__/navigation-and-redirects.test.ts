import nextConfig from "../../../../next.config";
import { navItems } from "../navigation";

describe("route management navigation", () => {
	test("shows the current operational pages", () => {
		const hrefs = navItems.map(({ href }) => href);

		expect(hrefs).toContain("/route-management");
		expect(hrefs).toContain("/route-history");
		expect(hrefs).toContain("/kids-and-schools");
		expect(hrefs).toContain("/audit");
		expect(hrefs).not.toContain("/routes");
	});

	test("redirects the removed legacy route planner", async () => {
		await expect(nextConfig.redirects?.()).resolves.toEqual([
			{
				source: "/routes/:path*",
				destination: "/route-management",
				permanent: false,
			},
		]);
	});
});
