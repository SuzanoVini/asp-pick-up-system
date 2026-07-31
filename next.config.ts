import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	turbopack: {
		root: __dirname,
	},
	// pdfkit reads its font metrics from disk at runtime; the .afm files are not
	// reachable by static analysis, so tracing has to be told to ship them.
	outputFileTracingIncludes: {
		"/**": ["./node_modules/pdfkit/js/data/*.afm"],
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "DENY" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{ key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
				],
			},
		];
	},
	async redirects() {
		return [
			{
				source: "/routes/:path*",
				destination: "/route-management",
				permanent: false,
			},
		];
	},
};

export default nextConfig;
