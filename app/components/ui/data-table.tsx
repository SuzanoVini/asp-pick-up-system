"use client";

import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, Search } from "lucide-react";

export interface Column<T> {
	key: string;
	label: string;
	sortable?: boolean;
	render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
	data: T[];
	columns: Column<T>[];
	searchable?: boolean;
	searchKeys?: string[];
	onRowClick?: (row: T) => void;
	emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
	data,
	columns,
	searchable = false,
	searchKeys = [],
	onRowClick,
	emptyMessage = "No records found.",
}: DataTableProps<T>) {
	const [sortKey, setSortKey] = useState<string | null>(null);
	const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		if (!search || searchKeys.length === 0) return data;
		const lower = search.toLowerCase();
		return data.filter((row) =>
			searchKeys.some((key) => {
				const val = row[key];
				return typeof val === "string" && val.toLowerCase().includes(lower);
			}),
		);
	}, [data, search, searchKeys]);

	const sorted = useMemo(() => {
		if (!sortKey) return filtered;
		return [...filtered].sort((a, b) => {
			const aVal = a[sortKey];
			const bVal = b[sortKey];
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return 1;
			if (bVal == null) return -1;
			const cmp = String(aVal).localeCompare(String(bVal));
			return sortDir === "asc" ? cmp : -cmp;
		});
	}, [filtered, sortKey, sortDir]);

	const handleSort = (key: string) => {
		if (sortKey === key) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
	};

	return (
		<div>
			{searchable && (
				<div className="mb-4 relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
					<input
						type="text"
						placeholder="Search..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
					/>
				</div>
			)}
			<div className="overflow-x-auto rounded-lg border border-gray-200">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							{columns.map((col) => (
								<th
									key={col.key}
									className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${
										col.sortable ? "cursor-pointer select-none hover:text-gray-700" : ""
									}`}
									onClick={col.sortable ? () => handleSort(col.key) : undefined}
								>
									<span className="inline-flex items-center gap-1">
										{col.label}
										{col.sortable && sortKey === col.key && (
											sortDir === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
										)}
									</span>
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200 bg-white">
						{sorted.length === 0 ? (
							<tr>
								<td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-500">
									{emptyMessage}
								</td>
							</tr>
						) : (
							sorted.map((row, i) => (
								<tr
									key={(row.id as string) ?? i}
									className={onRowClick ? "cursor-pointer hover:bg-gray-50" : ""}
									onClick={onRowClick ? () => onRowClick(row) : undefined}
								>
									{columns.map((col) => (
										<td key={col.key} className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
											{col.render ? col.render(row) : (row[col.key] as React.ReactNode) ?? "-"}
										</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			<div className="mt-2 text-xs text-gray-500">
				{sorted.length} {sorted.length === 1 ? "record" : "records"}
			</div>
		</div>
	);
}
