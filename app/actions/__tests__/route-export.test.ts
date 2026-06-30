import { revalidatePath } from "next/cache";
import { exportRoutePdf } from "../route-export";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("../../lib/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("../../lib/supabase/routes", () => ({
	getRouteById: jest.fn(),
	markRouteExported: jest.fn(),
}));
jest.mock("../../lib/supabase/route-stops", () => ({ getStopsForRoute: jest.fn() }));
jest.mock("../../lib/services/pdf/route-pdf", () => ({
	buildRoutePdf: jest.fn().mockResolvedValue(Buffer.from("pdf")),
	buildRoutePdfFilename: jest.fn().mockReturnValue("route.pdf"),
}));
jest.mock("../../lib/routes/audit", () => ({ writeRouteAuditEvent: jest.fn() }));

const { createClient } = jest.requireMock("../../lib/supabase/server") as {
	createClient: jest.Mock;
};
const { getRouteById, markRouteExported } = jest.requireMock("../../lib/supabase/routes") as {
	getRouteById: jest.Mock;
	markRouteExported: jest.Mock;
};
const { getStopsForRoute } = jest.requireMock("../../lib/supabase/route-stops") as {
	getStopsForRoute: jest.Mock;
};
const { buildRoutePdf, buildRoutePdfFilename } = jest.requireMock(
	"../../lib/services/pdf/route-pdf",
) as {
	buildRoutePdf: jest.Mock;
	buildRoutePdfFilename: jest.Mock;
};

describe("exportRoutePdf", () => {
	const client = {
		auth: {
			getUser: jest.fn().mockResolvedValue({ data: { user: { id: "owner-1" } } }),
		},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		jest.mocked(createClient).mockResolvedValue(client);
		jest.mocked(getRouteById).mockResolvedValue({
			id: "route-1",
			date: "2026-07-06",
			run_number: 2,
			vehicle_name_snapshot: "Van 1",
			plate_number_snapshot: "ABC 123",
			driver_name_snapshot: "Driver One",
			helper_name_snapshot: "Helper One",
			total_distance_km: 12.5,
		});
		jest.mocked(getStopsForRoute).mockResolvedValue([
			{
				id: "stop-1",
				route_id: "route-1",
				student_id: "student-1",
				school_id: "school-1",
				seat_number: 1,
				order_index: 1,
				distance_from_prev_km: 4.5,
				duration_from_prev_min: 9,
				needs_booster: true,
				student_name_snapshot: "Student One",
				school_name_snapshot: "School One",
				school_address_snapshot: "1 School St",
				dismissal_time_snapshot: "15:00",
				responsible_staff_id: "staff-1",
				responsible_staff_name_snapshot: "Responsible One",
			},
		]);
	});

	it("passes route plate, run, and responsible staff snapshots into the PDF builder", async () => {
		await exportRoutePdf("route-1");

		expect(buildRoutePdf).toHaveBeenCalledWith(
			expect.objectContaining({
				vehicleName: "Van 1",
				plateNumber: "ABC 123",
				runNumber: 2,
				stops: [
					expect.objectContaining({
						responsibleStaffId: "staff-1",
						responsibleStaffNameSnapshot: "Responsible One",
					}),
				],
			}),
		);
		expect(buildRoutePdfFilename).toHaveBeenCalledWith(
			expect.objectContaining({ vehicleName: "Van 1", runNumber: 2 }),
		);
		expect(markRouteExported).toHaveBeenCalledWith(client, "route-1", "owner-1");
		expect(revalidatePath).toHaveBeenCalledWith("/route-management");
	});
});
