import { getDay } from "date-fns";
import type { DayOfWeek, Enrollment, IntermediateStatus, Student } from "./types";

const DAY_INDEX_TO_NAME: Record<number, DayOfWeek> = {
	1: "Mon",
	2: "Tue",
	3: "Wed",
	4: "Thu",
	5: "Fri",
};

export function getDayOfWeek(date: Date): DayOfWeek | null {
	const idx = getDay(date);
	return DAY_INDEX_TO_NAME[idx] ?? null;
}

export function computeBaseSchedule(
	date: Date,
	students: Student[],
	enrollments: Enrollment[],
): IntermediateStatus[] {
	const dayOfWeek = getDayOfWeek(date);
	if (!dayOfWeek) return [];

	const dateStr = date.toISOString().split("T")[0];
	const results: IntermediateStatus[] = [];

	for (const student of students) {
		if (student.status !== "active") continue;

		const activeEnrollment = enrollments.find(
			(e) =>
				e.studentId === student.id &&
				e.status === "active" &&
				e.startDate <= dateStr &&
				(e.endDate === null || e.endDate >= dateStr),
		);

		if (!activeEnrollment) continue;

		const isScheduled = activeEnrollment.contractDays.includes(dayOfWeek);

		results.push({
			studentId: student.id,
			status: isScheduled ? "P" : "N",
			appliedRuleIds: [],
			effectiveDismissalTime: null,
		});
	}

	return results;
}
