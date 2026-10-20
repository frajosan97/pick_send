// resources/js/pages/Admin/Parcels/Show.tsx
import { Head, Link, router } from "@inertiajs/react";
import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { StatusPill } from "@/components/admin/status-pill";
import { money, num } from "@/components/admin/money";
import { FlashBanner } from "@/components/admin/flash-banner";
import {
    CashCodModal,
    ClaimCodeModal,
    MarkPaidModal,
    RetryStkModal,
    TransitionModal,
} from "@/components/admin/parcel-modals";
import { confirmDelete, toastError, toastSuccess } from "@/lib/toast";
import {
    ArrowLeft,
    Banknote,
    CalendarDays,
    FileDown,
    HandCoins,
    Link2,
    PenLine,
    Printer,
    Receipt,
    Trash2,
} from "lucide-react";

/* ============================================================
 | Types
 * ============================================================ */

type PaymentMethod = "mpesa" | "cash" | "wallet" | "other";

type PaymentTx = {
    id: number;
    status: string;
    type: string;
    amount: number;
    phone: string;
    checkout_request_id: string | null;
    merchant_request_id: string | null;
    mpesa_receipt_number: string | null;
    result_code: string | null;
    result_desc: string | null;
    completed_at: string | null;
    created_at: string | null;
};

type Payment = {
    id: number;
    type: string;
    method: PaymentMethod;
    amount: number;
    status: string;
    mpesa_code: string | null;
    reference: string | null;
    phone: string | null;
    confirmed_at: string | null;
    created_at: string | null;
    mpesa_transactions: PaymentTx[] | null;
};

type Event = {
    id: number;
    status: string;
    label: string;
    description: string | null;
    staff: string | null;
    location: string | null;
    happened_at: string;
};

type Parcel = {
    id: number;
    tracking_no: string;
    handover_code: string | null;
    status: string;
    payment_option: "prepaid" | "cod_fee" | "cod_full";
    created_at: string | null;
    paid_at: string | null;
    sender: { id: number | null; name: string; phone: string };
    recipient: { id: number | null; name: string; phone: string };
    town: string | null;
    route: string | null;
    contents: {
        description: string;
        kind: string;
        estimated_worth: number;
        weight_code: string | null;
        weight_kg: number | null;
        electronic_code: string | null;
        needs_packaging: boolean;
    };
    money: {
        delivery_fee: number;
        pack_fee: number;
        drop_off_fee: number;
        cod_amount: number;
        cod_fee: number;
        total: number;
        amount_due_now: number;
        amount_paid: number;
        balance_due: number;
        points_earned: number;
    };
    payments: Payment[];
    events: Event[];
};

type Props = {
    parcel: Parcel;
    statuses?: Record<string, string>;
    statsCardData?: {
        label: string;
        value: string;
        hint?: string;
        tone?: "default" | "success" | "danger" | "warning";
    }[];
};

const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("en-KE") : "—";

type ModalKind =
    | { kind: "retry"; paymentId: number }
    | { kind: "claim" }
    | { kind: "mark-paid" }
    | { kind: "transition" }
    | { kind: "cash-cod" }
    | { kind: "mpesa-details"; payment: Payment }
    | null;

type BusyKind = "print" | "pdf" | "delete" | null;

/* ============================================================
 | Local Tabs
 * ============================================================ */

type TabsContextValue = {
    value: string;
    setValue: (v: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
    const ctx = React.useContext(TabsContext);
    if (!ctx) throw new Error("Tabs.* must be used inside <Tabs>");
    return ctx;
}

function Tabs({
    value,
    onValueChange,
    children,
    className,
}: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <TabsContext.Provider value={{ value, setValue: onValueChange }}>
            <div className={className ?? "w-full"}>{children}</div>
        </TabsContext.Provider>
    );
}

function TabsList({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            role="tablist"
            className={`inline-flex flex-wrap items-center gap-1 rounded-lg border border-sidebar-border/70 bg-neutral-50 p-1 dark:bg-neutral-800/50 ${className ?? ""}`}
        >
            {children}
        </div>
    );
}

function TabsTrigger({
    value,
    children,
}: {
    value: string;
    children: React.ReactNode;
}) {
    const { value: active, setValue } = useTabsContext();
    const selected = active === value;

    return (
        <button
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => setValue(value)}
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                selected
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
        >
            {children}
        </button>
    );
}

function TabsContent({
    value,
    children,
    className,
}: {
    value: string;
    children: React.ReactNode;
    className?: string;
}) {
    const { value: active } = useTabsContext();
    if (active !== value) return null;

    return (
        <div role="tabpanel" className={`mt-3 ${className ?? ""}`}>
            {children}
        </div>
    );
}

/* ============================================================
 | Sub-components
 * ============================================================ */

function InfoRow({
    label,
    value,
    mono,
}: {
    label: string;
    value: React.ReactNode;
    mono?: boolean;
}) {
    return (
        <div className="flex justify-between gap-3 border-b border-sidebar-border/40 py-1.5 text-sm last:border-b-0">
            <span className="text-muted-foreground">{label}</span>
            <span
                className={`text-right ${mono ? "font-mono text-xs" : "font-medium"}`}
            >
                {value ?? (
                    <span className="italic text-muted-foreground">—</span>
                )}
            </span>
        </div>
    );
}

function Panel({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon?: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border border-sidebar-border/70 bg-card">
            <header className="flex items-center gap-2 border-b border-sidebar-border/70 px-4 py-2.5">
                {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {title}
                </h3>
            </header>
            <div className="px-4 py-1">{children}</div>
        </section>
    );
}

function MethodBadge({ method }: { method: PaymentMethod }) {
    const style: Record<PaymentMethod, string> = {
        mpesa: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
        cash: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
        wallet: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
        other: "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200",
    };
    const label: Record<PaymentMethod, string> = {
        mpesa: "M-PESA",
        cash: "Cash",
        wallet: "Wallet",
        other: "Other",
    };

    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[.68rem] font-semibold uppercase tracking-wide ${style[method]}`}
        >
            {label[method]}
        </span>
    );
}

function StatsCard({
    label,
    value,
    hint,
    tone = "default",
}: {
    label: string;
    value: string;
    hint?: string;
    tone?: "default" | "success" | "danger" | "warning";
}) {
    const accent: Record<typeof tone, string> = {
        default: "before:bg-neutral-300 dark:before:bg-neutral-600",
        success: "before:bg-emerald-500",
        danger: "before:bg-rose-500",
        warning: "before:bg-amber-500",
    };
    const valueColor =
        tone === "success"
            ? "text-emerald-600 dark:text-emerald-400"
            : tone === "danger"
              ? "text-rose-600 dark:text-rose-400"
              : tone === "warning"
                ? "text-amber-600 dark:text-amber-400"
                : "";

    return (
        <div
            className={`relative overflow-hidden rounded-xl border border-sidebar-border/70 bg-card p-4 before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:content-[''] ${accent[tone]}`}
        >
            <div className="pl-2">
                <div className="text-[.68rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                </div>
                <div
                    className={`mt-1 text-2xl font-bold tabular-nums ${valueColor}`}
                >
                    {value}
                </div>
                {hint && (
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        {hint}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================
 | Page
 * ============================================================ */

export default function Show({ parcel, statuses, statsCardData }: Props) {
    const [activeTab, setActiveTab] = useState("overview");
    const [modal, setModal] = useState<ModalKind>(null);
    const [busy, setBusy] = useState<BusyKind>(null);

    const onClose = () => setModal(null);

    const isFullyPaid = parcel.money.balance_due <= 0;
    const canCollectCash = parcel.payment_option !== "prepaid" && !isFullyPaid;

    const handleDelete = useCallback(async () => {
        if (busy) return;

        const ok = await confirmDelete(
            `Delete parcel ${parcel.tracking_no}? This cannot be undone.`,
        );
        if (!ok) return;

        setBusy("delete");

        router.delete(route("admin.parcels.destroy", parcel.id), {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess("Parcel deleted");
                router.visit(route("admin.parcels.index"));
            },
            onError: () => {
                toastError("Failed to delete parcel");
                setBusy(null);
            },
        });
    }, [busy, parcel.id, parcel.tracking_no]);

    /**
     * Print the parcel without navigating away and without a second
     * print invocation. The Blade print view MUST NOT call window.print()
     * itself — the React handler is the single source of truth.
     */
    const handlePrint = useCallback(() => {
        if (busy) return;
        setBusy("print");

        // Remove any pre-existing print frame so a stale load can't re-fire
        const existing = document.getElementById("parcel-print-frame");
        if (existing) existing.remove();

        const iframe = document.createElement("iframe");
        iframe.id = "parcel-print-frame";
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.visibility = "hidden";
        iframe.src = route("admin.parcels.print", parcel.id);

        let finished = false;

        const finish = () => {
            if (finished) return;
            finished = true;

            window.setTimeout(() => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                setBusy(null);
            }, 800);
        };

        iframe.onload = () => {
            // Prevent subsequent load events from re-entering this handler
            iframe.onload = null;

            const win = iframe.contentWindow;
            if (!win) {
                finish();
                return;
            }

            // Clean up as soon as the dialog is dismissed (Print or Cancel)
            win.onafterprint = finish;

            // Give the document a tick to paint fonts/colors before printing
            window.setTimeout(() => {
                try {
                    win.focus();
                    win.print(); // ← the ONLY print() call
                } catch {
                    finish();
                }
            }, 300);
        };

        document.body.appendChild(iframe);
    }, [busy, parcel.id]);

    const handleDownloadPdf = useCallback(async () => {
        if (busy) return;
        setBusy("pdf");

        try {
            const res = await fetch(route("admin.parcels.pdf", parcel.id), {
                method: "GET",
                credentials: "same-origin",
                headers: { Accept: "application/pdf" },
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = `${parcel.tracking_no}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            window.setTimeout(() => URL.revokeObjectURL(url), 1000);

            toastSuccess("PDF downloaded");
        } catch {
            toastError("Failed to download PDF");
        } finally {
            setBusy(null);
        }
    }, [busy, parcel.id, parcel.tracking_no]);

    const derivedStats = useMemo(() => {
        if (statsCardData && statsCardData.length > 0) {
            return statsCardData;
        }
        return [
            {
                label: "Total",
                value: money(parcel.money.total),
                hint: `Option: ${parcel.payment_option}`,
            },
            {
                label: "Paid",
                value: money(parcel.money.amount_paid),
                hint: `${parcel.payments.filter((p) => p.status === "success").length} successful`,
                tone: "success" as const,
            },
            {
                label: "Balance due",
                value: money(parcel.money.balance_due),
                hint: isFullyPaid ? "Fully settled" : "Outstanding",
                tone: (isFullyPaid ? "success" : "danger") as
                    | "success"
                    | "danger",
            },
            {
                label: "Points earned",
                value: num(parcel.money.points_earned),
                hint: "Loyalty",
            },
        ];
    }, [statsCardData, parcel, isFullyPaid]);

    const actionsDisabled = busy !== null;

    return (
        <>
            <Head title={`Parcel ${parcel.tracking_no}`} />
            <div className="space-y-4 p-6">
                <FlashBanner />

                {/* ---------------- header ---------------- */}
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    {/* left: title + meta */}
                    <div className="min-w-0">
                        <nav className="text-xs font-semibold uppercase text-muted-foreground">
                            <Link
                                href={route("admin.parcels.index")}
                                className="hover:underline"
                            >
                                Parcels
                            </Link>{" "}
                            <span className="opacity-50">/</span>{" "}
                            {parcel.tracking_no}
                        </nav>
                        <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold">
                            <span className="font-mono">
                                {parcel.tracking_no}
                            </span>
                            <StatusPill status={parcel.status} />
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>Created {fmtDate(parcel.created_at)}</span>
                            <span aria-hidden>·</span>
                            <span>Paid {fmtDate(parcel.paid_at)}</span>
                            <span aria-hidden>·</span>
                            <span>
                                Handover{" "}
                                <span className="font-mono text-foreground">
                                    {parcel.handover_code ?? "—"}
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* right: actions — 2 rows */}
                    <div className="flex flex-col items-stretch gap-2 lg:items-end">
                        {/* Row 1: Primary actions */}
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            {canCollectCash && (
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        setModal({ kind: "cash-cod" })
                                    }
                                    disabled={actionsDisabled}
                                >
                                    <HandCoins />
                                    COD
                                </Button>
                            )}

                            {!isFullyPaid && (
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                        setModal({ kind: "mark-paid" })
                                    }
                                    disabled={actionsDisabled}
                                >
                                    <Banknote />
                                    Mark paid
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setModal({ kind: "claim" })}
                                disabled={actionsDisabled}
                            >
                                <PenLine />
                                Reconcile
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setModal({ kind: "transition" })}
                                disabled={actionsDisabled}
                            >
                                <Link2 />
                                Status
                            </Button>
                        </div>

                        {/* Row 2: Icon actions */}
                        <div className="flex items-center gap-2 lg:justify-end">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handleDownloadPdf}
                                disabled={actionsDisabled}
                                title="Download PDF"
                                aria-label="Download PDF"
                            >
                                <FileDown className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={handlePrint}
                                disabled={actionsDisabled}
                                title="Print"
                                aria-label="Print"
                            >
                                <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/50"
                                onClick={handleDelete}
                                disabled={actionsDisabled}
                                title="Delete parcel"
                                aria-label="Delete parcel"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ---------------- stats cards ---------------- */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {derivedStats.map((stat) => (
                        <StatsCard
                            key={stat.label}
                            label={stat.label}
                            value={stat.value}
                            hint={stat.hint}
                            tone={stat.tone}
                        />
                    ))}
                </div>

                {/* ---------------- tabbed content ---------------- */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="payments">
                            Payments ({parcel.payments.length})
                        </TabsTrigger>
                        <TabsTrigger value="events">
                            Events ({parcel.events.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* ============ Overview ============ */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-4">
                                <Panel title="Sender">
                                    <InfoRow
                                        label="Name"
                                        value={parcel.sender.name}
                                    />
                                    <InfoRow
                                        label="Phone"
                                        value={parcel.sender.phone}
                                        mono
                                    />
                                </Panel>

                                <Panel title="Recipient">
                                    <InfoRow
                                        label="Name"
                                        value={parcel.recipient.name}
                                    />
                                    <InfoRow
                                        label="Phone"
                                        value={parcel.recipient.phone}
                                        mono
                                    />
                                </Panel>

                                <Panel title="Destination">
                                    <InfoRow
                                        label="Town"
                                        value={parcel.town ?? "—"}
                                    />
                                    <InfoRow
                                        label="Route"
                                        value={parcel.route ?? "—"}
                                    />
                                </Panel>
                            </div>

                            <div className="space-y-4">
                                <Panel title="Money">
                                    <InfoRow
                                        label="Delivery fee"
                                        value={money(parcel.money.delivery_fee)}
                                    />
                                    <InfoRow
                                        label="Packaging"
                                        value={money(parcel.money.pack_fee)}
                                    />
                                    <InfoRow
                                        label="Drop-off fee"
                                        value={money(parcel.money.drop_off_fee)}
                                    />
                                    <InfoRow
                                        label="COD amount"
                                        value={money(parcel.money.cod_amount)}
                                    />
                                    <InfoRow
                                        label="COD fee"
                                        value={money(parcel.money.cod_fee)}
                                    />
                                    <InfoRow
                                        label="Total"
                                        value={money(parcel.money.total)}
                                    />
                                    <InfoRow
                                        label="Amount due now"
                                        value={money(
                                            parcel.money.amount_due_now,
                                        )}
                                    />
                                    <InfoRow
                                        label="Paid"
                                        value={money(parcel.money.amount_paid)}
                                    />
                                    <InfoRow
                                        label="Balance due"
                                        value={money(parcel.money.balance_due)}
                                    />
                                </Panel>

                                <Panel title="Contents">
                                    <InfoRow
                                        label="Description"
                                        value={parcel.contents.description}
                                    />
                                    <InfoRow
                                        label="Kind"
                                        value={parcel.contents.kind}
                                    />
                                    <InfoRow
                                        label="Estimated worth"
                                        value={money(
                                            parcel.contents.estimated_worth,
                                        )}
                                    />
                                    <InfoRow
                                        label="Weight"
                                        value={
                                            parcel.contents.weight_kg !== null
                                                ? `${parcel.contents.weight_kg} kg (${parcel.contents.weight_code ?? "—"})`
                                                : (parcel.contents
                                                      .weight_code ?? "—")
                                        }
                                    />
                                    <InfoRow
                                        label="Electronic code"
                                        value={
                                            parcel.contents.electronic_code ??
                                            "—"
                                        }
                                        mono
                                    />
                                    <InfoRow
                                        label="Needs packaging"
                                        value={
                                            parcel.contents.needs_packaging
                                                ? "Yes"
                                                : "No"
                                        }
                                    />
                                </Panel>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ============ Payments ============ */}
                    <TabsContent value="payments">
                        {parcel.payments.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-sidebar-border/70 p-8 text-center text-sm text-muted-foreground">
                                No payments for this parcel.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 bg-card">
                                <table className="ps-table w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Type</th>
                                            <th>Method</th>
                                            <th>Status</th>
                                            <th className="text-right">
                                                Amount
                                            </th>
                                            <th className="text-right">
                                                Extra info
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parcel.payments.map((pay) => (
                                            <tr
                                                key={pay.id}
                                                className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
                                            >
                                                <td className="whitespace-nowrap text-xs text-muted-foreground">
                                                    {fmtDate(pay.created_at)}
                                                </td>
                                                <td>
                                                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-[.7rem] font-bold uppercase tracking-wide dark:bg-neutral-800">
                                                        {pay.type}
                                                    </span>
                                                </td>
                                                <td>
                                                    <MethodBadge
                                                        method={pay.method}
                                                    />
                                                </td>
                                                <td>
                                                    <StatusPill
                                                        status={pay.status}
                                                    />
                                                </td>
                                                <td className="text-right font-mono font-medium">
                                                    {money(pay.amount)}
                                                </td>
                                                <td className="text-right">
                                                    {pay.method === "mpesa" ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 rounded-full px-3 text-xs"
                                                            onClick={() =>
                                                                setModal({
                                                                    kind: "mpesa-details",
                                                                    payment:
                                                                        pay,
                                                                })
                                                            }
                                                        >
                                                            <Receipt className="mr-1 h-3 w-3" />
                                                            View
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </TabsContent>

                    {/* ============ Events ============ */}
                    <TabsContent value="events">
                        {parcel.events.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-sidebar-border/70 p-8 text-center text-sm text-muted-foreground">
                                No events recorded.
                            </div>
                        ) : (
                            <div className="rounded-xl border border-sidebar-border/70 bg-card p-4">
                                <ol className="relative ml-2 space-y-4 border-l border-sidebar-border/70 pl-5">
                                    {parcel.events.map((e) => (
                                        <li key={e.id} className="relative">
                                            <span className="absolute -left-[26px] mt-1 h-3 w-3 rounded-full border-2 border-card bg-ps-brand" />
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-sm font-semibold">
                                                    {e.label}
                                                </span>
                                                <StatusPill status={e.status} />
                                            </div>
                                            {e.description && (
                                                <div className="mt-0.5 text-sm text-muted-foreground">
                                                    {e.description}
                                                </div>
                                            )}
                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                <CalendarDays className="mr-1 inline h-3 w-3" />
                                                {fmtDate(e.happened_at)}
                                                {e.staff && <> · {e.staff}</>}
                                                {e.location && (
                                                    <> · {e.location}</>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* ---------------- modals ---------------- */}

            {modal?.kind === "retry" && (
                <RetryStkModal
                    open
                    onClose={onClose}
                    parcelId={parcel.id}
                    paymentId={modal.paymentId}
                />
            )}

            {modal?.kind === "claim" && (
                <ClaimCodeModal open onClose={onClose} parcelId={parcel.id} />
            )}

            {modal?.kind === "mark-paid" && (
                <MarkPaidModal open onClose={onClose} parcelId={parcel.id} />
            )}

            {modal?.kind === "transition" && (
                <TransitionModal
                    open
                    onClose={onClose}
                    parcelId={parcel.id}
                    currentStatus={parcel.status}
                    statuses={statuses ?? {}}
                />
            )}

            {modal?.kind === "cash-cod" && (
                <CashCodModal
                    open
                    onClose={onClose}
                    parcelId={parcel.id}
                    expectedAmount={parcel.money.balance_due}
                />
            )}

            {modal?.kind === "mpesa-details" && (
                <MpesaDetailsModal
                    open
                    onClose={onClose}
                    payment={modal.payment}
                />
            )}
        </>
    );
}

Show.layout = {
    breadcrumbs: [{ title: "Parcels", href: "/admin/parcels" }],
};

/* ============================================================
 | M-PESA details modal
 * ============================================================ */

function MpesaDetailsModal({
    open,
    onClose,
    payment,
}: {
    open: boolean;
    onClose: () => void;
    payment: Payment;
}) {
    const attempts = payment.mpesa_transactions ?? [];

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>M-PESA details</DialogTitle>
                    <DialogDescription>
                        Receipt, checkout, and attempt history for this payment.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 rounded-lg border border-sidebar-border/70 bg-neutral-50 p-3 text-sm dark:bg-neutral-800/40">
                        <SummaryRow label="Type" value={payment.type} />
                        <SummaryRow label="Status" value={payment.status} />
                        <SummaryRow
                            label="Amount"
                            value={money(payment.amount)}
                        />
                        <SummaryRow
                            label="Receipt"
                            value={payment.mpesa_code ?? "—"}
                            mono
                        />
                        <SummaryRow
                            label="Confirmed"
                            value={fmtDate(payment.confirmed_at)}
                        />
                        <SummaryRow
                            label="Reference"
                            value={payment.reference ?? "—"}
                            mono
                        />
                    </div>

                    <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Attempts ({attempts.length})
                        </h4>
                        {attempts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No M-PESA attempt rows recorded for this
                                payment.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-md border border-sidebar-border/60">
                                <table className="ps-table w-full text-[.8rem]">
                                    <thead>
                                        <tr>
                                            <th>When</th>
                                            <th>Status</th>
                                            <th className="text-right">
                                                Amount
                                            </th>
                                            <th>Receipt</th>
                                            <th>Checkout</th>
                                            <th>Result</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attempts.map((tx) => (
                                            <tr key={tx.id}>
                                                <td className="whitespace-nowrap text-xs text-muted-foreground">
                                                    {fmtDate(tx.created_at)}
                                                </td>
                                                <td>
                                                    <StatusPill
                                                        status={tx.status}
                                                    />
                                                </td>
                                                <td className="text-right font-mono">
                                                    {money(tx.amount)}
                                                </td>
                                                <td className="font-mono text-[.75rem]">
                                                    {tx.mpesa_receipt_number ??
                                                        "—"}
                                                </td>
                                                <td className="font-mono text-[.7rem] text-muted-foreground">
                                                    {tx.checkout_request_id ??
                                                        "—"}
                                                </td>
                                                <td className="text-[.72rem] text-muted-foreground">
                                                    {tx.result_code ?? "—"}{" "}
                                                    {tx.result_desc ?? ""}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </DialogBody>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SummaryRow({
    label,
    value,
    mono,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{label}</span>
            <span
                className={`text-right ${mono ? "font-mono text-xs" : "font-medium"}`}
            >
                {value}
            </span>
        </div>
    );
}
