import { createClient } from "@/app/lib/supabase/server";
import { VehicleList } from "./vehicle-list";

export default async function VehiclesPage() {
	const supabase = await createClient();
	const { data: vehicles } = await supabase.from("asp_vehicles").select("*").order("name");

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Vehicles</h1>
			<VehicleList vehicles={vehicles ?? []} />
		</div>
	);
}
