"use server";

import { revalidatePath } from "next/cache";
import { createSchoolSchema, updateSchoolSchema } from "@/app/lib/schemas/school";
import { createDistanceService } from "@/app/lib/services/distance";
import * as schoolsDb from "@/app/lib/supabase/schools";
import { createClient } from "@/app/lib/supabase/server";

async function withGeocodedAddress(input: Record<string, unknown>) {
	if (!Object.hasOwn(input, "address")) return input;

	const address = typeof input.address === "string" ? input.address.trim() : null;
	if (!address) {
		return { ...input, address: null, lat: null, lng: null };
	}

	if (!process.env.GOOGLE_MAPS_API_KEY) {
		return { ...input, address };
	}

	const service = createDistanceService();
	const location = await service.geocode(address);
	if (!location) {
		throw new Error("Google Maps could not find coordinates for that school address.");
	}

	return { ...input, address, lat: location.lat, lng: location.lng };
}

export async function createSchoolAction(formData: Record<string, unknown>) {
	const parsed = createSchoolSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	let input: Record<string, unknown>;
	try {
		input = await withGeocodedAddress(parsed.data);
	} catch (error) {
		return {
			error: {
				address: [error instanceof Error ? error.message : "Could not geocode school address."],
			},
		};
	}

	const data = await schoolsDb.createSchool(supabase, input);

	revalidatePath("/schools");
	return { data };
}

export async function updateSchoolAction(id: string, formData: Record<string, unknown>) {
	const parsed = updateSchoolSchema.safeParse(formData);
	if (!parsed.success) {
		return { error: parsed.error.flatten().fieldErrors };
	}

	const supabase = await createClient();
	let input: Record<string, unknown>;
	try {
		input = await withGeocodedAddress(parsed.data);
	} catch (error) {
		return {
			error: {
				address: [error instanceof Error ? error.message : "Could not geocode school address."],
			},
		};
	}

	const data = await schoolsDb.updateSchool(supabase, id, input);

	revalidatePath("/schools");
	return { data };
}

export async function deleteSchoolAction(id: string) {
	const supabase = await createClient();
	try {
		await schoolsDb.deleteSchool(supabase, id);
	} catch (error) {
		if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
			return {
				error:
					"This school is linked to students, calendar rules, or route history. Move or remove those records first, or mark the school inactive.",
			};
		}

		throw error;
	}

	revalidatePath("/schools");
	return { success: true };
}
