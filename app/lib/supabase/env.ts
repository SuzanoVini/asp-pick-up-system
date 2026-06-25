function requireValue(name: string, value: string | undefined): string {
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
}

export function getSupabaseConfig() {
	return {
		url: requireValue("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
		anonKey: requireValue(
			"NEXT_PUBLIC_SUPABASE_ANON_KEY",
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
		),
	};
}
