import { filterByName } from "../search-filter";

const items = [
	{ id: "1", name: "Nori Ori-Jesu" },
	{ id: "2", name: "Charlotte Zessel" },
	{ id: "3", name: "Jack Driver" },
];

describe("filterByName", () => {
	it("returns all items for an empty query", () => {
		expect(filterByName(items, "")).toEqual(items);
	});

	it("returns all items for a whitespace-only query", () => {
		expect(filterByName(items, "   ")).toEqual(items);
	});

	it("matches case-insensitively on a substring", () => {
		expect(filterByName(items, "char")).toEqual([items[1]]);
	});

	it("matches on a surname typed mid-name", () => {
		expect(filterByName(items, "zessel")).toEqual([items[1]]);
	});

	it("ignores surrounding whitespace in the query", () => {
		expect(filterByName(items, "  jack  ")).toEqual([items[2]]);
	});

	it("returns an empty array when nothing matches", () => {
		expect(filterByName(items, "zzz")).toEqual([]);
	});
});
