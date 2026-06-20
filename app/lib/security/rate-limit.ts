const store = new Map<string, { count: number; resetAt: number }>();

interface RateLimitConfig {
	maxRequests: number;
	windowMs: number;
}

const DEFAULTS: Record<string, RateLimitConfig> = {
	write: { maxRequests: 60, windowMs: 60_000 },
	route_generation: { maxRequests: 10, windowMs: 60_000 },
	pdf_export: { maxRequests: 10, windowMs: 60_000 },
};

export function checkRateLimit(
	userId: string,
	action: string,
): { allowed: boolean; retryAfterMs: number } {
	const config = DEFAULTS[action] ?? DEFAULTS.write;
	const key = `${userId}:${action}`;
	const now = Date.now();
	const entry = store.get(key);

	if (!entry || now > entry.resetAt) {
		store.set(key, { count: 1, resetAt: now + config.windowMs });
		return { allowed: true, retryAfterMs: 0 };
	}

	if (entry.count >= config.maxRequests) {
		return { allowed: false, retryAfterMs: entry.resetAt - now };
	}

	entry.count++;
	return { allowed: true, retryAfterMs: 0 };
}
