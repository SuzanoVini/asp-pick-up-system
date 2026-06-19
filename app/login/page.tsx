"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { Logo } from "@/app/components/layout/logo";

export default function LoginPage() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		const supabase = createClient();
		const { error: authError } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (authError) {
			setError(authError.message);
			setLoading(false);
			return;
		}

		router.push("/");
		router.refresh();
	};

	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div
				className="w-full max-w-sm rounded-lg border p-8"
				style={{
					backgroundColor: "white",
					borderColor: "#e5e7eb",
					boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
				}}
			>
				<div className="mb-6 flex justify-center">
					<div
						className="rounded-lg p-1"
						style={{ backgroundColor: "var(--color-sidebar-bg)" }}
					>
						<Logo />
					</div>
				</div>

				<h2 className="mb-6 text-center text-xl font-semibold">Sign in</h2>

				{error && (
					<div
						className="mb-4 rounded-md px-4 py-3 text-sm"
						style={{
							backgroundColor: "#fef2f2",
							color: "var(--color-error)",
							border: "1px solid #fecaca",
						}}
					>
						{error}
					</div>
				)}

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div>
						<label htmlFor="email" className="mb-1 block text-sm font-medium">
							Email
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoComplete="email"
							className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
							style={{
								borderColor: "#d1d5db",
															}}
						/>
					</div>

					<div>
						<label htmlFor="password" className="mb-1 block text-sm font-medium">
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							autoComplete="current-password"
							className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
							style={{
								borderColor: "#d1d5db",
															}}
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
						style={{ backgroundColor: "var(--color-primary)" }}
					>
						{loading ? "Signing in..." : "Sign in"}
					</button>
				</form>
			</div>
		</div>
	);
}
