import { todayInTimeZone } from "../dates";

describe("todayInTimeZone", () => {
	// 2026-07-10T02:30:00Z is still 2026-07-09 in Vancouver (UTC-7 in July)
	const lateEveningUtc = new Date("2026-07-10T02:30:00Z");

	test("returns the previous calendar day for a timezone behind UTC", () => {
		expect(todayInTimeZone("America/Vancouver", lateEveningUtc)).toBe("2026-07-09");
	});

	test("returns the UTC date for UTC", () => {
		expect(todayInTimeZone("UTC", lateEveningUtc)).toBe("2026-07-10");
	});

	test("falls back to the UTC date for an invalid timezone", () => {
		expect(todayInTimeZone("Not/AZone", lateEveningUtc)).toBe("2026-07-10");
	});
});
