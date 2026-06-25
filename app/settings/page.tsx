import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getSystemSettings } from "@/app/lib/supabase/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const { data: profile, error } = await supabase
		.from("user_profiles")
		.select("role")
		.eq("id", user.id)
		.maybeSingle();

	if (error) {
		throw error;
	}

	if (profile?.role !== "owner") {
		redirect("/");
	}

	const settings = await getSystemSettings(supabase);

	return (
		<div className="mx-auto max-w-2xl">
			<h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>
			<SettingsForm settings={settings} />
		</div>
	);
}
