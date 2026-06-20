import { z } from "zod";

export const ruleTypeEnum = z.enum([
	"District-Wide Break",
	"District Pro-D Day",
	"School-Specific Holiday",
	"School Pro-D Day",
	"Early Dismissal",
	"Student Temporary Absence",
	"Attends Every Other Week",
	"Temporary Day Switch",
	"Extra Pickup Day",
]);

export const targetTypeEnum = z.enum(["all", "school", "student"]);

const dayOfWeek = z.enum(["Mon", "Tue", "Wed", "Thu", "Fri"]);

export const createCalendarRuleSchema = z
	.object({
		rule_type: ruleTypeEnum,
		target_type: targetTypeEnum,
		target_student_id: z.string().uuid().nullable().optional(),
		target_school_id: z.string().uuid().nullable().optional(),
		target_name: z.string().trim().max(500).nullable().optional(),
		start_date: z.coerce.date(),
		end_date: z.coerce.date(),
		days_of_week: z.array(dayOfWeek).nullable().optional(),
		switch_from_to: z.string().trim().max(20).nullable().optional(),
		description: z.string().trim().max(2000).nullable().optional(),
		start_week: z.enum(["Absent", "Present"]).nullable().optional(),
		early_dismissal_time: z.string().nullable().optional(),
		is_active: z.boolean().default(true),
	})
	.refine((data) => data.end_date >= data.start_date, {
		message: "End date must be on or after start date",
		path: ["end_date"],
	})
	.refine(
		(data) => {
			if (data.target_type === "school") return !!data.target_school_id;
			if (data.target_type === "student") return !!data.target_student_id;
			return true;
		},
		{ message: "Target ID required for school or student rules", path: ["target_type"] },
	)
	.refine(
		(data) => {
			if (data.rule_type === "Temporary Day Switch") return !!data.switch_from_to;
			return true;
		},
		{ message: "Switch days required for day switch rules", path: ["switch_from_to"] },
	)
	.refine(
		(data) => {
			if (data.rule_type === "Attends Every Other Week") return !!data.start_week;
			return true;
		},
		{ message: "Start week required for alternating week rules", path: ["start_week"] },
	);

export const updateCalendarRuleSchema = z
	.object({
		rule_type: ruleTypeEnum.optional(),
		target_type: targetTypeEnum.optional(),
		target_student_id: z.string().uuid().nullable().optional(),
		target_school_id: z.string().uuid().nullable().optional(),
		target_name: z.string().trim().max(500).nullable().optional(),
		start_date: z.coerce.date().optional(),
		end_date: z.coerce.date().optional(),
		days_of_week: z.array(dayOfWeek).nullable().optional(),
		switch_from_to: z.string().trim().max(20).nullable().optional(),
		description: z.string().trim().max(2000).nullable().optional(),
		start_week: z.enum(["Absent", "Present"]).nullable().optional(),
		early_dismissal_time: z.string().nullable().optional(),
		is_active: z.boolean().optional(),
	})
	.refine(
		(data) => {
			if (data.end_date && data.start_date) return data.end_date >= data.start_date;
			return true;
		},
		{ message: "End date must be on or after start date", path: ["end_date"] },
	);

export type CreateCalendarRuleInput = z.infer<typeof createCalendarRuleSchema>;
export type UpdateCalendarRuleInput = z.infer<typeof updateCalendarRuleSchema>;
