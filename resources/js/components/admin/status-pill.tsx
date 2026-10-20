// resources/js/components/admin/status-pill.tsx
const STATUS_COLORS: Record<string, string> = {
    draft: "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100",
    booked: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    awaiting_payment:
        "bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200",
    payment_on_delivery:
        "bg-violet-100 text-violet-900 dark:bg-violet-900/50 dark:text-violet-200",
    paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-200",
    received: "bg-sky-100 text-sky-900 dark:bg-sky-900/50 dark:text-sky-200",
    in_transit:
        "bg-indigo-100 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-200",
    at_pickup:
        "bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/50 dark:text-fuchsia-200",
    collected:
        "bg-emerald-200 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100",
    returned:
        "bg-rose-100 text-rose-900 dark:bg-rose-900/50 dark:text-rose-200",
    cancelled:
        "bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100",
};

const LABELS: Record<string, string> = {
    draft: "Draft",
    booked: "Booked",
    awaiting_payment: "Awaiting payment",
    payment_on_delivery: "Payment on delivery",
    paid: "Paid",
    received: "Received",
    in_transit: "In transit",
    at_pickup: "At pickup",
    collected: "Collected",
    returned: "Returned",
    cancelled: "Cancelled",
};

export function StatusPill({ status }: { status: string }) {
    const cls =
        STATUS_COLORS[status] ??
        "bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100";
    const label = LABELS[status] ?? status.replace(/_/g, " ");
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold whitespace-nowrap ${cls}`}
        >
            {label}
        </span>
    );
}
