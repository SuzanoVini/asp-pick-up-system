import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./env";

export async function createClient() {
	const cookieStore = await cookies();
	const { url, anonKey } = getSupabaseConfig();

	return createServerClient(url, anonKey, {
		cookies: {
			getAll() {
				return cookieStore.getAll();
			},
			setAll(cookiesToSet) {
				for (const { name, value, options } of cookiesToSet) {
					try {
						cookieStore.set(name, value, options);
					} catch {
						// setAll is called from Server Components where cookies can't be set.
						// This is safe to ignore when the middleware handles session refresh.
					}
				}
			},
		},
	});
}
