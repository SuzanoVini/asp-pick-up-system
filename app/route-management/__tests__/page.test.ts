import { loadRouteManagementPageData } from "../page-data";

jest.mock("../../lib/security/authorization", () => ({
	getAuthorizedUser: jest.fn(),
	requireOwner: jest.fn(),
}));
jest.mock("../../lib/supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("../../lib/supabase/route-plans", () => ({ getPlanForDate: jest.fn() }));

const { getAuthorizedUser, requireOwner } = jest.requireMock(
	"../../lib/security/authorization",
) as { getAuthorizedUser: jest.Mock; requireOwner: jest.Mock };
const { createClient } = jest.requireMock("../../lib/supabase/server") as {
	createClient: jest.Mock;
};
const { getPlanForDate } = jest.requireMock("../../lib/supabase/route-plans") as {
	getPlanForDate: jest.Mock;
};

describe("RouteManagementPage", () => {
	it("requires owner access before loading plan data", async () => {
		const client = {};
		jest.mocked(createClient).mockResolvedValue(client);
		jest.mocked(getAuthorizedUser).mockResolvedValue({ id: "staff-1", role: "staff" });
		jest.mocked(requireOwner).mockImplementation(() => {
			throw new Error("Owner access required");
		});

		await expect(loadRouteManagementPageData("2026-07-06")).rejects.toThrow(
			"Owner access required",
		);

		expect(getAuthorizedUser).toHaveBeenCalledWith(client);
		expect(getPlanForDate).not.toHaveBeenCalled();
	});
});
