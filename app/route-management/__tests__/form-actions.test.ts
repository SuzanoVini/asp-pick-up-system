import { finalizeRoutePlanFromForm } from "../form-actions";

jest.mock("../../actions/route-management", () => ({
	finalizeRoutePlan: jest.fn(),
}));

const actions = jest.requireMock("../../actions/route-management") as Record<string, jest.Mock>;

function form(entries: Array<[string, string]>) {
	const data = new FormData();
	for (const [name, value] of entries) data.append(name, value);
	return data;
}

describe("route management form actions", () => {
	beforeEach(() => jest.clearAllMocks());

	it("passes readiness acknowledgements and blocker override details", async () => {
		await finalizeRoutePlanFromForm(
			form([
				["planId", "plan-1"],
				["acknowledgedWarning", "unrouted_students"],
				["overrideCheck", "missing_driver"],
				["overrideReason", "Owner approved emergency coverage"],
			]),
		);

		expect(actions.finalizeRoutePlan).toHaveBeenCalledWith({
			planId: "plan-1",
			acknowledgedWarnings: ["unrouted_students"],
			override: {
				checkNames: ["missing_driver"],
				reason: "Owner approved emergency coverage",
			},
		});
	});

	it("omits the override block when no blockers were overridden", async () => {
		await finalizeRoutePlanFromForm(
			form([
				["planId", "plan-1"],
				["acknowledgedWarning", "unrouted_students"],
			]),
		);

		expect(actions.finalizeRoutePlan).toHaveBeenCalledWith({
			planId: "plan-1",
			acknowledgedWarnings: ["unrouted_students"],
			override: null,
		});
	});
});
