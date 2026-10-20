// resources/js/components/admin/flash-banner.tsx
import { usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import {
    AlertCircle,
    CheckCircle2,
    Info,
    X,
    AlertTriangle,
} from "lucide-react";

/* ============================================================
 | Types
 * ============================================================ */

type FlashKind = "success" | "error" | "info" | "warning";

type FlashPayload = {
    success?: string | null;
    error?: string | null;
    info?: string | null;
    warning?: string | null;
};

type PageProps = {
    flash?: FlashPayload;
};

/* ============================================================
 | Config
 * ============================================================ */

const ORDER: FlashKind[] = ["success", "error", "info", "warning"];

const STYLES: Record<
    FlashKind,
    { wrap: string; icon: string; label: string; Icon: typeof CheckCircle2 }
> = {
    success: {
        wrap: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100",
        icon: "text-emerald-600 dark:text-emerald-400",
        label: "Success",
        Icon: CheckCircle2,
    },
    error: {
        wrap: "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/60 dark:text-rose-100",
        icon: "text-rose-600 dark:text-rose-400",
        label: "Error",
        Icon: AlertCircle,
    },
    info: {
        wrap: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100",
        icon: "text-sky-600 dark:text-sky-400",
        label: "Info",
        Icon: Info,
    },
    warning: {
        wrap: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100",
        icon: "text-amber-600 dark:text-amber-400",
        label: "Warning",
        Icon: AlertTriangle,
    },
};

/** Kinds that auto-dismiss after N seconds. Errors stay until dismissed. */
const AUTO_DISMISS_MS: Partial<Record<FlashKind, number>> = {
    success: 5000,
    info: 5000,
    warning: 8000,
    // error: undefined → never auto-dismiss
};

/* ============================================================
 | Component
 * ============================================================ */

export function FlashBanner() {
    const { flash } = usePage<PageProps>().props;

    // Track dismissal per message *text* so re-renders with the same
    // flash don't resurrect a dismissed banner.
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    // Reset dismissals whenever the flash payload changes identity.
    // (Every Inertia navigation replaces props.flash.)
    useEffect(() => {
        setDismissed(new Set());
    }, [flash?.success, flash?.error, flash?.info, flash?.warning]);

    const messages = ORDER.map((kind) => ({
        kind,
        text: flash?.[kind] ?? null,
    }))
        .filter((m): m is { kind: FlashKind; text: string } => !!m.text)
        .filter((m) => !dismissed.has(`${m.kind}:${m.text}`));

    if (messages.length === 0) return null;

    return (
        <div className="space-y-2" role="status" aria-live="polite">
            {messages.map(({ kind, text }) => (
                <Banner
                    key={`${kind}:${text}`}
                    kind={kind}
                    text={text}
                    onDismiss={() =>
                        setDismissed((prev) => {
                            const next = new Set(prev);
                            next.add(`${kind}:${text}`);
                            return next;
                        })
                    }
                />
            ))}
        </div>
    );
}

/* ============================================================
 | Single banner
 * ============================================================ */

function Banner({
    kind,
    text,
    onDismiss,
}: {
    kind: FlashKind;
    text: string;
    onDismiss: () => void;
}) {
    const style = STYLES[kind];
    const { Icon } = style;

    // Auto-dismiss for transient kinds (success / info / warning).
    useEffect(() => {
        const ttl = AUTO_DISMISS_MS[kind];
        if (!ttl) return;

        const timer = setTimeout(onDismiss, ttl);
        return () => clearTimeout(timer);
    }, [kind, onDismiss]);

    return (
        <div
            className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-sm shadow-sm ${style.wrap}`}
        >
            <Icon
                className={`mt-0.5 h-4 w-4 flex-none ${style.icon}`}
                aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
                <span className="sr-only">{style.label}: </span>
                <span className="break-words">{text}</span>
            </div>
            <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss message"
                className="ml-1 rounded p-0.5 transition hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-current focus-visible:outline-none dark:hover:bg-white/10"
            >
                <X className="h-3.5 w-3.5 opacity-70" />
            </button>
        </div>
    );
}
