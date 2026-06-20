import { useId } from "react";

interface DatePickerProps {
	value: string;
	onChange: (value: string) => void;
	label?: string;
	required?: boolean;
	min?: string;
	max?: string;
}

export function DatePicker({ value, onChange, label, required, min, max }: DatePickerProps) {
	const id = useId();

	return (
		<div>
			{label && (
				<label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
					{label}
					{required && <span className="ml-0.5 text-red-500">*</span>}
				</label>
			)}
			<input
				id={id}
				type="date"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				min={min}
				max={max}
				className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
			/>
		</div>
	);
}
