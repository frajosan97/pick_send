// resources/js/components/admin/form-field.tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/* ---------------- Field wrapper ---------------- */

export function Field({
    label,
    error,
    hint,
    required,
    children,
}: {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
    children?: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label>
                {label}
                {required && <span className="ml-0.5 text-destructive">*</span>}
            </Label>
            {children}
            {hint && !error && (
                <p className="text-xs text-muted-foreground">{hint}</p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

/* ---------------- TextField ---------------- */

type TextFieldProps = {
    value: any;
    onChange: (v: any) => void;
    type?:
        | "text"
        | "number"
        | "email"
        | "tel"
        | "url"
        | "password"
        | "search"
        | "date"
        | "datetime-local"
        | "time";
    placeholder?: string;
    disabled?: boolean;
    readOnly?: boolean;
    autoFocus?: boolean;
    autoComplete?: string;
    className?: string;
    inputMode?:
        | "text"
        | "numeric"
        | "tel"
        | "email"
        | "url"
        | "search"
        | "decimal";
    maxLength?: number;
    min?: number;
    max?: number;
    step?: number | string;
    id?: string;
    name?: string;
};

export function TextField({
    value,
    onChange,
    type = "text",
    placeholder,
    disabled,
    readOnly,
    autoFocus,
    autoComplete,
    className,
    inputMode,
    maxLength,
    min,
    max,
    step,
    id,
    name,
}: TextFieldProps) {
    const handle = (raw: string) => {
        if (type === "number") {
            if (raw === "") return onChange("");
            const n = Number(raw);
            onChange(Number.isFinite(n) ? n : raw);
        } else {
            onChange(raw);
        }
    };

    return (
        <Input
            id={id}
            name={name}
            type={type}
            value={value ?? ""}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            autoComplete={autoComplete}
            inputMode={inputMode}
            maxLength={maxLength}
            min={min}
            max={max}
            step={step}
            onChange={(e) => handle(e.target.value)}
            className={className}
        />
    );
}

/* ---------------- SelectField ---------------- */

type SelectFieldOption =
    | Record<string, string>
    | { value: string | number; label: string }[];

type SelectFieldProps = {
    value: any;
    onChange: (v: any) => void;
    options: SelectFieldOption;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
    name?: string;
};

export function SelectField({
    value,
    onChange,
    options,
    placeholder,
    disabled,
    className,
    id,
    name,
}: SelectFieldProps) {
    const normalised: { value: string | number; label: string }[] =
        Array.isArray(options)
            ? options
            : Object.entries(options).map(([v, l]) => ({ value: v, label: l }));

    return (
        <select
            id={id}
            name={name}
            value={value ?? ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className={
                className ??
                "h-9 w-full rounded-md border border-sidebar-border bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            }
        >
            {placeholder && <option value="">{placeholder}</option>}
            {normalised.map((o) => (
                <option key={String(o.value)} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    );
}
