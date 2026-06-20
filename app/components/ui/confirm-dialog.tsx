"use client";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	destructive?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	destructive = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				className="fixed inset-0 bg-black/50"
				onClick={onCancel}
				onKeyDown={(e) => {
					if (e.key === "Escape") onCancel();
				}}
				aria-label="Close dialog"
			/>
			<div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<h3 className="text-lg font-semibold text-gray-900">{title}</h3>
				<p className="mt-2 text-sm text-gray-600">{message}</p>
				<div className="mt-6 flex justify-end gap-3">
					<button
						type="button"
						onClick={onCancel}
						className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						{cancelLabel}
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
							destructive
								? "bg-red-600 hover:bg-red-700"
								: "bg-[var(--color-primary)] hover:opacity-90"
						}`}
					>
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	);
}
