import type { SupabaseClient } from "@supabase/supabase-js";

export type UserRole = "owner" | "staff";

export interface AuthorizedUser {
	id: string;
	role: UserRole;
}

export async function getAuthorizedUser(supabase: SupabaseClient): Promise<AuthorizedUser> {
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Error("Not authenticated");
	}

	const { data: profile } = await supabase
		.from("user_profiles")
		.select("role")
		.eq("id", user.id)
		.single();

	return {
		id: user.id,
		role: (profile?.role as UserRole) ?? "staff",
	};
}

export function requireOwner(user: AuthorizedUser): void {
	if (user.role !== "owner") {
		throw new Error("Owner access required");
	}
}

export function requireAuthenticated(user: AuthorizedUser): void {
	if (!user.id) {
		throw new Error("Authentication required");
	}
}
