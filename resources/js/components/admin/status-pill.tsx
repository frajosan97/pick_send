// resources/js/components/admin/status-pill.tsx
import React from "react";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const STATUS_TONES: Record<string, Tone> = {
    // success
    success: "success",
    paid: "success",
    completed: "success",
    delivered: "success",
    active: "success",
    approved: "success",
    verified: "success",
    // warning
    pending: "warning",
    processing: "warning",
    in_transit: "warning",
    in_transit_to_recipient: "warning",
    out_for_delivery: "warning",
    awaiting_payment: "warning",
    // danger
    failed: "danger",
    cancelled: "danger",
    canceled: "danger",
    rejected: "danger",
    expired: "danger",
    refunded: "danger",
    // info
    new: "info",
    draft: "info",
    created: "info",
};

const TONE_CLASSES: Record<Tone, string> = {
    default:
        "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200",
    success:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    warning:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    danger: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    info: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
};

export function StatusPill({
    status,
    className,
}: {
    status?: string | null;
    className?: string;
}) {
    // Defensive: backend sometimes returns null/undefined/empty status.
    const raw = (status ?? "").toString().trim();
    const key = raw.toLowerCase().replace(/[\s-]+/g, "_");
    const label = raw ? raw.replace(/_/g, " ") : "—";
    const tone = STATUS_TONES[key] ?? "default";

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[.68rem] font-semibold uppercase tracking-wide ${TONE_CLASSES[tone]} ${className ?? ""}`}
        >
            {label}
        </span>
    );
}

export default StatusPill;
