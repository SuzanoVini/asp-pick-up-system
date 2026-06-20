import { getDayOfWeek } from "./base-schedule";
import type { CalendarRule } from "./types";

export function isRuleActiveForDate(date: Date, rule: CalendarRule): boolean {
	const dateStr = date.toISOString().split("T")[0];
	if (dateStr < rule.startDate || dateStr > rule.endDate) return false;

	if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
		const dow = getDayOfWeek(date);
		if (!dow || !rule.daysOfWeek.includes(dow)) return false;
	}

	return true;
}
