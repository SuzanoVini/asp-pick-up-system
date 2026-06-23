"use client";

import { MapPin } from "lucide-react";
import { useState } from "react";
import { updateSettingsAction } from "@/app/actions/settings";
import { FormField } from "@/app/components/ui/form-field";

interface SettingsFormProps {
	settings: {
		appName: string;
		timezone: string;
		defaultDismissalTime: string;
		defaultEarlyDismissalTime: string;
		routeOriginAddress: string | null;
		routeOriginLat: number | null;
		routeOriginLng: number | null;
	};
}

export function SettingsForm({ settings }: SettingsFormProps) {
	const [appName, setAppName] = useState(settings.appName);
	const [timezone, setTimezone] = useState(settings.timezone);
	const [dismissalTime, setDismissalTime] = useState(settings.defaultDismissalTime);
	const [edTime, setEdTime] = useState(settings.defaultEarlyDismissalTime);
	const [originAddress, setOriginAddress] = useState(settings.routeOriginAddress ?? "");
	const [errors, setErrors] = useState<Record<string, string[]>>({});
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const [currentCoords, setCurrentCoords] = useState<{
		lat: number | null;
		lng: number | null;
	}>({
		lat: settings.routeOriginLat,
		lng: settings.routeOriginLng,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSaving(true);
		setErrors({});
		setSaved(false);

		const result = await updateSettingsAction({
			appName,
			timezone,
			defaultDismissalTime: dismissalTime,
			defaultEarlyDismissalTime: edTime,
			routeOriginAddress: originAddress,
		});

		setSaving(false);

		if (result.error) {
			setErrors(result.error as Record<string, string[]>);
		} else {
			setSaved(true);
			if (result.settings) {
				setCurrentCoords({
					lat: result.settings.routeOriginLat,
					lng: result.settings.routeOriginLng,
				});
				setOriginAddress(result.settings.routeOriginAddress ?? "");
			}
			setTimeout(() => setSaved(false), 3000);
		}
	};

	const inputClass =
		"w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]";

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			<section>
				<h2 className="mb-4 text-lg font-semibold text-gray-900">General</h2>
				<div className="rounded-lg border border-gray-200 bg-white p-6">
					<FormField label="Program Name" required error={errors.appName}>
						<input
							type="text"
							value={appName}
							onChange={(e) => setAppName(e.target.value)}
							className={inputClass}
						/>
					</FormField>
					<FormField label="Timezone" required error={errors.timezone}>
						<select
							value={timezone}
							onChange={(e) => setTimezone(e.target.value)}
							className={inputClass}
						>
							<option value="America/Vancouver">Pacific (America/Vancouver)</option>
							<option value="America/Edmonton">Mountain (America/Edmonton)</option>
							<option value="America/Chicago">Central (America/Chicago)</option>
							<option value="America/Toronto">Eastern (America/Toronto)</option>
							<option value="America/Halifax">Atlantic (America/Halifax)</option>
							<option value="America/Los_Angeles">Pacific (America/Los_Angeles)</option>
							<option value="America/Denver">Mountain (America/Denver)</option>
							<option value="America/New_York">Eastern (America/New_York)</option>
						</select>
					</FormField>
					<div className="grid grid-cols-2 gap-4">
						<FormField label="Default Dismissal Time" error={errors.defaultDismissalTime}>
							<input
								type="time"
								value={dismissalTime}
								onChange={(e) => setDismissalTime(e.target.value)}
								className={inputClass}
							/>
						</FormField>
						<FormField
							label="Default Early Dismissal Time"
							error={errors.defaultEarlyDismissalTime}
						>
							<input
								type="time"
								value={edTime}
								onChange={(e) => setEdTime(e.target.value)}
								className={inputClass}
							/>
						</FormField>
					</div>
				</div>
			</section>

			<section>
				<h2 className="mb-4 text-lg font-semibold text-gray-900">Route Origin</h2>
				<div className="rounded-lg border border-gray-200 bg-white p-6">
					<p className="mb-4 text-sm text-gray-600">
						The starting point for all pickup routes. When set, route generation uses Google Maps
						driving distance from this address to optimize school visit order.
					</p>
					<FormField label="Origin Address" error={errors.routeOriginAddress}>
						<div className="relative">
							<MapPin
								size={16}
								className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
							/>
							<input
								type="text"
								value={originAddress}
								onChange={(e) => setOriginAddress(e.target.value)}
								placeholder="e.g. 123 Main St, Vancouver, BC"
								className={`${inputClass} pl-9`}
							/>
						</div>
					</FormField>
					{currentCoords.lat !== null && currentCoords.lng !== null && (
						<p className="mt-1 text-xs text-gray-500">
							Geocoded: {currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)}
						</p>
					)}
				</div>
			</section>

			<div className="flex items-center gap-3">
				<button
					type="submit"
					disabled={saving}
					className="rounded-md bg-[var(--color-primary)] px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
				>
					{saving ? "Saving..." : "Save Settings"}
				</button>
				{saved && <span className="text-sm font-medium text-green-600">Settings saved</span>}
			</div>
		</form>
	);
}
