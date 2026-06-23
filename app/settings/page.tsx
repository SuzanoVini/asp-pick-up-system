import { getAuthorizedUser, requireOwner } from "@/app/lib/security/authorization";
import { createClient } from "@/app/lib/supabase/server";
import { getSystemSettings } from "@/app/lib/supabase/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
	const supabase = await createClient();
	const user = await getAuthorizedUser(supabase);
	requireOwner(user);

	const settings = await getSystemSettings(supabase);

	return (
		<div className="mx-auto max-w-2xl">
			<h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>
			<SettingsForm settings={settings} />
		</div>
	);
}
