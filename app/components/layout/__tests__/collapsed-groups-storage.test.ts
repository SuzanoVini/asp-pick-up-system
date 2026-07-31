import { loadCollapsedGroups, saveCollapsedGroups } from "../collapsed-groups-storage";

function fakeStorage(initial: Record<string, string> = {}) {
	const store = { ...initial };
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		store,
	};
}

describe("collapsed-groups-storage", () => {
	it("returns an empty list when nothing is stored", () => {
		expect(loadCollapsedGroups(fakeStorage())).toEqual([]);
	});

	it("round-trips a saved list", () => {
		const storage = fakeStorage();
		saveCollapsedGroups(storage, ["records", "admin"]);
		expect(loadCollapsedGroups(storage)).toEqual(["records", "admin"]);
	});

	it("returns an empty list for corrupt stored JSON instead of throwing", () => {
		const storage = fakeStorage({ "asp-sidebar-collapsed-groups": "{not json" });
		expect(loadCollapsedGroups(storage)).toEqual([]);
	});
});
