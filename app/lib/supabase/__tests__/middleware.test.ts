import { NextRequest } from "next/server";
import { updateSession } from "../middleware";

describe("supabase auth middleware", () => {
	const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	afterEach(() => {
		process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
	});

	test("returns a configuration error response when Supabase env vars are missing", async () => {
		delete process.env.NEXT_PUBLIC_SUPABASE_URL;
		delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		const response = await updateSession(new NextRequest("https://example.test/"));

		expect(response.status).toBe(500);
		await expect(response.json()).resolves.toEqual({
			error: "Server configuration error",
		});
	});
});
