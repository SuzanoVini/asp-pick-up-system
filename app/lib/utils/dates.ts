export function todayInTimeZone(timeZone: string, now = new Date()): string {
	try {
		// en-CA formats as YYYY-MM-DD
		return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
	} catch {
		return now.toISOString().slice(0, 10);
	}
}
