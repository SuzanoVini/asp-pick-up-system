"use client";

import { type DragEvent, type KeyboardEvent, useState } from "react";
import type { AssignmentSource } from "./assignment-resolver";
import type { SeatRow as SeatRowData } from "./seat-template";

function readDraggedStudentSource(event: DragEvent): AssignmentSource | undefined {
	const raw = event.dataTransfer.getData("application/json");
	if (!raw) return undefined;
	try {
		return JSON.parse(raw) as AssignmentSource;
	} catch {
		return undefined;
	}
}

export interface SeatRowProps {
	row: SeatRowData;
	routeId: string;
	editable: boolean;
	armed: boolean;
	onAssign: (seatNumber: number, source?: AssignmentSource) => void;
	onAssignStaff?: (staffId: string) => void;
	searchResults?: { id: string; name: string; subtitle?: string }[];
	onSearch?: (query: string) => void;
	onSelectSearchResult?: (id: string) => void;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	canMoveUp?: boolean;
	canMoveDown?: boolean;
}

/**
 * One row of a lane's fixed seat template. The same row is simultaneously a
 * drop target, a click target (when the board has a source armed), and a
 * type-ahead field, so all three input modes stay live at once. It never calls
 * server actions itself — it reports the targeted seat and lets the board
 * resolve what that means.
 */
export function SeatRow({
	row,
	routeId,
	editable,
	armed,
	onAssign,
	onAssignStaff,
	searchResults = [],
	onSearch,
	onSelectSearchResult,
	onMoveUp,
	onMoveDown,
	canMoveUp = true,
	canMoveDown = true,
}: SeatRowProps) {
	const [dragOver, setDragOver] = useState(false);

	if (row.kind !== "student") {
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: drop target for staff chips; dragging is a pointer-only shortcut and the lane's driver/helper selects remain the keyboard path.
			<div
				data-seat-kind={row.kind}
				className="flex items-center justify-between rounded px-2 py-1.5 text-xs"
				onDragOver={editable ? (event) => event.preventDefault() : undefined}
				onDrop={
					editable
						? (event) => {
								event.preventDefault();
								const staffId = event.dataTransfer.getData("text/staff-id");
								if (staffId) onAssignStaff?.(staffId);
							}
						: undefined
				}
			>
				<span className="font-semibold uppercase text-[var(--color-muted)]">{row.kind}</span>
				<span>{row.occupantStaffId ?? "open"}</span>
			</div>
		);
	}

	const { seatNumber, stopId } = row;
	const occupied = stopId !== null;
	const clickToAssign = editable && armed;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drag handlers are a pointer-only shortcut; when a source is armed this row also exposes role="button" with Enter/Space, and the type-ahead input is always available.
		<div
			data-seat-number={seatNumber}
			data-seat-kind="student"
			// `relative` anchors the type-ahead result list below.
			className={`relative flex items-center gap-2 rounded px-2 py-1.5 text-xs ${
				dragOver ? "ring-2 ring-[var(--color-primary)]" : ""
			}`}
			role={clickToAssign ? "button" : undefined}
			tabIndex={clickToAssign ? 0 : undefined}
			onDragOver={
				editable
					? (event) => {
							event.preventDefault();
							setDragOver(true);
						}
					: undefined
			}
			onDragLeave={editable ? () => setDragOver(false) : undefined}
			onDrop={
				editable
					? (event) => {
							event.preventDefault();
							setDragOver(false);
							onAssign(seatNumber, readDraggedStudentSource(event));
						}
					: undefined
			}
			onClick={clickToAssign ? () => onAssign(seatNumber) : undefined}
			onKeyDown={
				clickToAssign
					? (event: KeyboardEvent<HTMLDivElement>) => {
							if (event.key === "Enter" || event.key === " ") {
								event.preventDefault();
								onAssign(seatNumber);
							}
						}
					: undefined
			}
		>
			<span className="w-5 text-center font-semibold">{seatNumber}</span>
			{occupied ? (
				// biome-ignore lint/a11y/noStaticElementInteractions: drag source for moving an assigned student; the Move up/down buttons and type-ahead cover the same operations by keyboard.
				<div
					className="flex-1"
					draggable={editable}
					onDragStart={
						editable
							? (event) => {
									const source: AssignmentSource = { kind: "routed", stopId, routeId };
									event.dataTransfer.setData("application/json", JSON.stringify(source));
								}
							: undefined
					}
				>
					<div className="font-medium">
						{row.occupantName} {row.needsBooster && <span title="Needs booster">booster</span>}
					</div>
					<div className="text-[var(--color-muted)]">
						{row.schoolName} · {row.responsibleStaffName ?? "unassigned"} ·{" "}
						{row.dismissalTime ?? ""} · {row.schoolAddress ?? ""}
					</div>
					{editable && (
						<div
							data-order-index={row.orderIndex ?? undefined}
							className="mt-1 flex items-center gap-2 text-[10px]"
						>
							<span>Order: {row.orderIndex}</span>
							<button type="button" disabled={!canMoveUp} onClick={onMoveUp}>
								Move up
							</button>
							<button type="button" disabled={!canMoveDown} onClick={onMoveDown}>
								Move down
							</button>
						</div>
					)}
				</div>
			) : editable ? (
				<input
					className="flex-1 border-none bg-transparent text-xs outline-none"
					placeholder="Drop, click, or type to assign…"
					onChange={(event) => onSearch?.(event.target.value)}
				/>
			) : (
				<span className="flex-1 text-[var(--color-muted)]">—</span>
			)}
			{!occupied && searchResults.length > 0 && (
				<ul className="absolute top-full left-0 z-10 mt-1 rounded border bg-white shadow">
					{searchResults.map((result) => (
						<li key={result.id}>
							<button type="button" onClick={() => onSelectSearchResult?.(result.id)}>
								{result.name} {result.subtitle}
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
