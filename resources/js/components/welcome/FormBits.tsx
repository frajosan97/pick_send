// src/components/pickandsend/FormBits.tsx
import type { ReactNode } from "react";
import { INPUT, HINT, H3, TH } from "./shared";

export function Fld({
    id,
    label,
    hint,
    error,
    hidden,
    select,
    children,
    className,
    ...rest
}: any) {
    if (hidden) return null;
    const err = typeof error === "string" && error ? error : "";
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={id} className="text-[.88rem] font-semibold">
                {label}
            </label>
            {select ? (
                <select
                    id={id}
                    className={`${INPUT} ${err ? "border-ps-warn" : ""}`}
                    {...rest}
                >
                    {children}
                </select>
            ) : (
                <input
                    id={id}
                    className={`${INPUT} ${err ? "border-ps-warn" : ""} ${className ?? ""}`}
                    aria-invalid={!!err}
                    {...rest}
                />
            )}
            {err ? (
                <span className="text-[.84rem] font-semibold text-ps-warnink">
                    {err}
                </span>
            ) : (
                hint && <span className={HINT}>{hint}</span>
            )}
        </div>
    );
}

export function Choice({
    label,
    children,
    cols = 2,
}: {
    label: ReactNode;
    children: ReactNode;
    cols?: 1 | 2 | 4;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[.88rem] font-semibold">{label}</span>
            <div
                role="radiogroup"
                className={`grid gap-2 ${cols === 1 ? "grid-cols-1" : cols === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}
            >
                {children}
            </div>
        </div>
    );
}

export function Opt({ children, className = "", ...input }: any) {
    return (
        <label
            className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] border-ps-line px-3 py-1.5 text-[.92rem] font-semibold has-[:checked]:border-ps-accent has-[:checked]:bg-ps-soft has-[:checked]:text-ps-softink ${className}`}
        >
            <input
                className="h-[18px] w-[18px] flex-none accent-[#4FD1C0]"
                {...input}
            />
            <span>{children}</span>
        </label>
    );
}

export function Part({
    n,
    title,
    children,
}: {
    n: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-ps-line bg-ps-surface p-4 sm:p-[22px]">
            <div className={`flex items-center gap-2.5 text-[1.2rem] ${H3}`}>
                <i className="grid h-[30px] w-[30px] place-items-center rounded-full bg-ps-brand text-[.95rem] text-ps-onbrand not-italic">
                    {n}
                </i>
                {title}
            </div>
            {children}
        </div>
    );
}

export function Table({
    head,
    rows,
    small,
}: {
    head: string[];
    rows: ReactNode;
    small?: boolean;
}) {
    return (
        <table
            className={`w-full border-collapse tabular-nums ${small ? "" : "min-w-[560px] max-sm:min-w-0"}`}
        >
            <thead>
                <tr>
                    {head.map((h, i) => (
                        <th
                            key={h}
                            className={`${TH} ${i ? "text-right" : ""}`}
                        >
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
    );
}
