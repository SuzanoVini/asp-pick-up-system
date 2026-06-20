export function getRequiredEnv(name: string): string {
	const value = process.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export function getSupabaseConfig() {
	return {
		url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
		anonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
	};
}
