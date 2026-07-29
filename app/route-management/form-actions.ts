"use server";

import { finalizeRoutePlan } from "../actions/route-management";

const value = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export async function finalizeRoutePlanFromForm(formData: FormData) {
	const checkNames = formData.getAll("overrideCheck").map(String);
	await finalizeRoutePlan({
		planId: value(formData, "planId"),
		acknowledgedWarnings: formData.getAll("acknowledgedWarning").map(String) as never,
		override:
			checkNames.length > 0
				? {
						checkNames: checkNames as never,
						reason: value(formData, "overrideReason"),
					}
				: null,
	});
}
