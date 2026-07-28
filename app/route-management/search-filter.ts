/** Case-insensitive substring filter backing the seat-row type-ahead. */
export function filterByName<T extends { name: string }>(items: T[], query: string): T[] {
	const trimmed = query.trim().toLowerCase();
	if (!trimmed) return items;
	return items.filter((item) => item.name.toLowerCase().includes(trimmed));
}
