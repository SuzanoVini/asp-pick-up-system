const STORAGE_KEY = "asp-sidebar-collapsed-groups";

export function loadCollapsedGroups(storage: Pick<Storage, "getItem">): string[] {
	try {
		const raw = storage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((value): value is string => typeof value === "string")
			: [];
	} catch {
		return [];
	}
}

export function saveCollapsedGroups(storage: Pick<Storage, "setItem">, groupIds: string[]): void {
	storage.setItem(STORAGE_KEY, JSON.stringify(groupIds));
}
