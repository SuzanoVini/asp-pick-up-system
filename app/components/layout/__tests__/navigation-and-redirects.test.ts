import nextConfig from "../../../../next.config";
import { navItems } from "../navigation";

describe("route management rollout navigation", () => {
	test("shows only the current route management links", () => {
		const hrefs = navItems.map(({ href }) => href);

		expect(hrefs).toContain("/route-management");
		expect(hrefs).toContain("/route-history");
		expect(hrefs).not.toContain("/routes");
		expect(hrefs).not.toContain("/kids-and-schools");
		expect(hrefs).not.toContain("/audit");
	});

	test("temporarily redirects legacy route pages", async () => {
		await expect(nextConfig.redirects?.()).resolves.toEqual([
			{
				source: "/routes/:path*",
				destination: "/route-management",
				permanent: false,
			},
			{
				source: "/kids-and-schools/:path*",
				destination: "/route-management",
				permanent: false,
			},
			{ source: "/audit", destination: "/", permanent: false },
		]);
	});
});
