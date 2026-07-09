import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "./env";

export async function updateSession(request: NextRequest) {
	let supabaseResponse = NextResponse.next({ request });
	let config: ReturnType<typeof getSupabaseConfig>;
	try {
		config = getSupabaseConfig();
	} catch (error) {
		if (error instanceof Error && error.message.startsWith("Missing required environment variable:")) {
			return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
		}
		throw error;
	}

	const supabase = createServerClient(config.url, config.anonKey, {
		cookies: {
			getAll() {
				return request.cookies.getAll();
			},
			setAll(cookiesToSet) {
				for (const { name, value } of cookiesToSet) {
					request.cookies.set(name, value);
				}
				supabaseResponse = NextResponse.next({ request });
				for (const { name, value, options } of cookiesToSet) {
					supabaseResponse.cookies.set(name, value, options);
				}
			},
		},
	});

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const isLoginPage = request.nextUrl.pathname === "/login";

	if (!user && !isLoginPage) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	if (user && isLoginPage) {
		const url = request.nextUrl.clone();
		url.pathname = "/";
		return NextResponse.redirect(url);
	}

	return supabaseResponse;
}
