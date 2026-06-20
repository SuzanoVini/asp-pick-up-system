interface FormFieldProps {
	label: string;
	error?: string | string[];
	required?: boolean;
	children: React.ReactNode;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
	const errorMsg = Array.isArray(error) ? error[0] : error;
	return (
		<div className="mb-4">
			<label className="mb-1 block text-sm font-medium text-gray-700">
				{label}
				{required && <span className="ml-0.5 text-red-500">*</span>}
			</label>
			{children}
			{errorMsg && <p className="mt-1 text-xs text-red-600">{errorMsg}</p>}
		</div>
	);
}
