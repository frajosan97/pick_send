// resources/js/pages/Admin/SupplyRequests/Show.tsx
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
import { FlashBanner } from "@/components/admin/flash-banner";
import { money } from "@/components/admin/money";
import {
    RecordSupplyPaymentModal,
    SupplyStkModal,
} from "@/components/admin/supply-modals";
import { confirmDelete, toastError, toastSuccess } from "@/lib/toast";
import {
    ArrowLeft,
    Banknote,
    CalendarDays,
    CreditCard,
    HandCoins,
    MapPin,
    Receipt,
    Repeat,
    Trash2,
    User as UserIcon,
    Wallet,
} from "lucide-react";

/* ============================================================
 | Types
 * ============================================================ */

type PaymentMethod = "mpesa" | "cash";

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
    amount: number;
    channel: string;
    method: PaymentMethod;
    status: string;
    reference: string | null;
    phone: string | null;
    mpesa_code: string | null;
    confirmed_at: string | null;
    created_at: string | null;
    mpesa_transactions: PaymentTx[];
};

type Occurrence = {
    id: number;
    scheduled_for: string | null;
    status: string;
    quoted_amount: number | null;
};

type SupplyRequest = {
    id: number;
    parent_id: number | null;
    scheduled_for: string | null;
    recurring: boolean;
    name: string;
    phone: string;
    what: string;
    pickup_from: string | null;
    supplier_phone: string | null;
    frequency: string;
    status: string;
    quoted_amount: number | null;
    quoted_at: string | null;
    amount_paid: number;
    balance_due: number;
    is_fully_paid: boolean;
    town: { id: number; name: string } | null;
    user: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
        deleted_at: string | null;
    } | null;
    parent: { id: number; scheduled_for: string | null; status: string } | null;
    occurrences: Occurrence[];
    payments: Payment[];
    created_at: string | null;
    updated_at: string | null;
    deleted_at: string | null;
};

type Props = {
    request: SupplyRequest;
    options: {
        statuses: Record<string, string>;
        frequencies: Record<string, string>;
    };
};

type ModalKind =
    | { kind: "record-payment" }
    | { kind: "stk" }
    | { kind: "mpesa-details"; payment: Payment }
    | null;

const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("en-KE") : "—";

const fmtDateOnly = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("en-KE") : "—";

/* ============================================================
 | Local Tabs (identical to Parcels/Show)
 * ============================================================ */

type TabsContextValue = { value: string; setValue: (v: string) => void };
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
}: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
}) {
    return (
        <TabsContext.Provider value={{ value, setValue: onValueChange }}>
            <div className="w-full">{children}</div>
        </TabsContext.Provider>
    );
}

function TabsList({ children }: { children: React.ReactNode }) {
    return (
        <div
            role="tablist"
            className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-sidebar-border/70 bg-neutral-50 p-1 dark:bg-neutral-800/50"
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
    action,
    children,
}: {
    title: string;
    icon?: React.ComponentType<{ className?: string }>;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border border-sidebar-border/70 bg-card">
            <header className="flex items-center justify-between gap-2 border-b border-sidebar-border/70 px-4 py-2.5">
                <div className="flex items-center gap-2">
                    {Icon && (
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {title}
                    </h3>
                </div>
                {action}
            </header>
            <div className="px-4 py-1">{children}</div>
        </section>
    );
}

function MethodBadge({ method }: { method: PaymentMethod }) {
    const style: Record<PaymentMethod, string> = {
        mpesa: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
        cash: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    };
    const label: Record<PaymentMethod, string> = {
        mpesa: "M-PESA",
        cash: "Cash",
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

export default function Show({ request, options }: Props) {
    const [activeTab, setActiveTab] = useState("overview");
    const [modal, setModal] = useState<ModalKind>(null);
    const [busy, setBusy] = useState(false);
    const [quoteAmount, setQuoteAmount] = useState<string>(
        request.quoted_amount?.toString() ?? "",
    );

    const onClose = () => setModal(null);
    const isDeleted = request.deleted_at !== null;
    const actionsDisabled = busy || isDeleted;
    const canQuote = !isDeleted && request.quoted_amount === null;
    const canReviseQuote =
        !isDeleted &&
        request.quoted_amount !== null &&
        request.amount_paid === 0;
    const canPay =
        !isDeleted && !request.is_fully_paid && request.quoted_amount !== null;

    /* ---------------- actions ---------------- */

    const changeStatus = useCallback(
        (status: string) => {
            if (busy || status === request.status) return;
            setBusy(true);
            router.patch(
                route("admin.supply-requests.update-status", request.id),
                { status },
                {
                    preserveScroll: true,
                    onSuccess: () => toastSuccess("Status updated"),
                    onError: () => toastError("Failed to update status"),
                    onFinish: () => setBusy(false),
                },
            );
        },
        [busy, request.id, request.status],
    );

    const submitQuote = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const amount = Number(quoteAmount);
            if (!Number.isInteger(amount) || amount < 1) {
                toastError("Enter a valid amount");
                return;
            }
            setBusy(true);
            router.patch(
                route("admin.supply-requests.quote", request.id),
                { quoted_amount: amount },
                {
                    preserveScroll: true,
                    onSuccess: () => toastSuccess("Quote set"),
                    onError: () => toastError("Failed to set quote"),
                    onFinish: () => setBusy(false),
                },
            );
        },
        [busy, quoteAmount, request.id],
    );

    const handleDelete = useCallback(async () => {
        if (busy) return;
        const ok = await confirmDelete(
            `Delete supply request #${request.id}? This can be restored later.`,
        );
        if (!ok) return;
        setBusy(true);
        router.delete(route("admin.supply-requests.destroy", request.id), {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess("Supply request deleted");
                router.visit(route("admin.supply-requests.index"));
            },
            onError: () => {
                toastError("Failed to delete");
                setBusy(false);
            },
        });
    }, [busy, request.id]);

    const handleRestore = useCallback(() => {
        if (busy) return;
        setBusy(true);
        router.post(
            route("admin.supply-requests.restore", request.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toastSuccess("Restored"),
                onError: () => toastError("Failed to restore"),
                onFinish: () => setBusy(false),
            },
        );
    }, [busy, request.id]);

    /* ---------------- stats ---------------- */

    const stats = useMemo(
        () => [
            {
                label: "Quoted",
                value:
                    request.quoted_amount !== null
                        ? money(request.quoted_amount)
                        : "—",
                hint: request.quoted_at
                    ? `on ${fmtDateOnly(request.quoted_at)}`
                    : "not yet quoted",
                tone: (request.quoted_amount !== null
                    ? "default"
                    : "warning") as "default" | "warning",
            },
            {
                label: "Paid",
                value: money(request.amount_paid),
                hint: `${request.payments.filter((p) => p.status === "success").length} successful`,
                tone: "success" as const,
            },
            {
                label: "Balance",
                value: money(request.balance_due),
                hint: request.is_fully_paid ? "Fully settled" : "Outstanding",
                tone: (request.is_fully_paid ? "success" : "danger") as
                    | "success"
                    | "danger",
            },
            {
                label: "Frequency",
                value:
                    options.frequencies[request.frequency] ?? request.frequency,
                hint: request.recurring
                    ? "Recurring master"
                    : request.parent_id
                      ? "Occurrence"
                      : "One-off",
            },
        ],
        [request, options],
    );

    return (
        <>
            <Head title={`Supply request #${request.id}`} />
            <div className="space-y-4 p-6">
                <FlashBanner />

                {/* ---------------- header ---------------- */}
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    <div className="min-w-0">
                        <nav className="text-xs font-semibold uppercase text-muted-foreground">
                            <Link
                                href={route("admin.supply-requests.index")}
                                className="hover:underline"
                            >
                                Supply requests
                            </Link>{" "}
                            <span className="opacity-50">/</span> #{request.id}
                        </nav>
                        <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold">
                            <span>Request #{request.id}</span>
                            <StatusPill status={request.status} />
                            {request.recurring && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[.68rem] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                                    <Repeat className="h-3 w-3" />
                                    Recurring
                                </span>
                            )}
                            {isDeleted && (
                                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[.68rem] font-semibold uppercase tracking-wide text-rose-800 dark:bg-rose-900/50 dark:text-rose-200">
                                    Deleted
                                </span>
                            )}
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>Created {fmtDate(request.created_at)}</span>
                            <span aria-hidden>·</span>
                            <span>Updated {fmtDate(request.updated_at)}</span>
                            {request.scheduled_for && (
                                <>
                                    <span aria-hidden>·</span>
                                    <span>
                                        Scheduled{" "}
                                        {fmtDateOnly(request.scheduled_for)}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 lg:items-end">
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                            {canPay && (
                                <>
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            setModal({ kind: "stk" })
                                        }
                                        disabled={actionsDisabled}
                                    >
                                        <CreditCard />
                                        Send STK
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            setModal({ kind: "record-payment" })
                                        }
                                        disabled={actionsDisabled}
                                    >
                                        <HandCoins />
                                        Record payment
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2 lg:justify-end">
                            <Button variant="outline" size="sm" asChild>
                                <Link
                                    href={route("admin.supply-requests.index")}
                                >
                                    <ArrowLeft className="mr-1 h-4 w-4" />
                                    Back
                                </Link>
                            </Button>
                            {isDeleted ? (
                                <Button
                                    size="sm"
                                    onClick={handleRestore}
                                    disabled={busy}
                                >
                                    Restore
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/50"
                                    onClick={handleDelete}
                                    disabled={busy}
                                    title="Delete"
                                    aria-label="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ---------------- stats cards ---------------- */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((s) => (
                        <StatsCard
                            key={s.label}
                            label={s.label}
                            value={s.value}
                            hint={s.hint}
                            tone={s.tone}
                        />
                    ))}
                </div>

                {/* ---------------- status switcher ---------------- */}
                {!isDeleted && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                            Set status:
                        </span>
                        {Object.entries(options.statuses).map(([k, v]) => (
                            <Button
                                key={k}
                                size="sm"
                                variant={
                                    request.status === k ? "default" : "outline"
                                }
                                onClick={() => changeStatus(k)}
                                disabled={busy || request.status === k}
                            >
                                {v}
                            </Button>
                        ))}
                    </div>
                )}

                {/* ---------------- quote form ---------------- */}
                {(canQuote || canReviseQuote) && (
                    <Panel
                        title={canQuote ? "Set quote" : "Revise quote"}
                        icon={Receipt}
                        action={
                            request.quoted_at && (
                                <span className="text-xs text-muted-foreground">
                                    Quoted {fmtDate(request.quoted_at)}
                                </span>
                            )
                        }
                    >
                        <form
                            onSubmit={submitQuote}
                            className="flex items-end gap-2 py-2"
                        >
                            <label className="flex-1 space-y-1">
                                <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Amount (KES)
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={quoteAmount}
                                    onChange={(e) =>
                                        setQuoteAmount(e.target.value)
                                    }
                                    className="w-full rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                                    required
                                />
                            </label>
                            <Button type="submit" size="sm" disabled={busy}>
                                {canQuote ? "Set quote" : "Save"}
                            </Button>
                        </form>
                    </Panel>
                )}

                {/* ---------------- tabbed content ---------------- */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="payments">
                            Payments ({request.payments.length})
                        </TabsTrigger>
                        {request.occurrences.length > 0 && (
                            <TabsTrigger value="occurrences">
                                Occurrences ({request.occurrences.length})
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* ============ Overview ============ */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-4">
                                <Panel title="Requester" icon={UserIcon}>
                                    <InfoRow
                                        label="Name"
                                        value={request.name}
                                    />
                                    <InfoRow
                                        label="Phone"
                                        value={request.phone}
                                        mono
                                    />
                                    {request.user ? (
                                        <>
                                            <InfoRow
                                                label="Linked account"
                                                value={
                                                    <Link
                                                        href={route(
                                                            "admin.users.show",
                                                            request.user.id,
                                                        )}
                                                        className="hover:underline"
                                                    >
                                                        {request.user.name}
                                                    </Link>
                                                }
                                            />
                                            <InfoRow
                                                label="Account email"
                                                value={request.user.email}
                                                mono
                                            />
                                            {request.user.deleted_at && (
                                                <InfoRow
                                                    label="Account deleted"
                                                    value={fmtDate(
                                                        request.user.deleted_at,
                                                    )}
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <InfoRow
                                            label="Account"
                                            value={
                                                <span className="italic text-muted-foreground">
                                                    Submitted anonymously
                                                </span>
                                            }
                                        />
                                    )}
                                </Panel>

                                <Panel title="Destination" icon={MapPin}>
                                    <InfoRow
                                        label="Town"
                                        value={request.town?.name ?? "—"}
                                    />
                                    <InfoRow
                                        label="Pickup from"
                                        value={request.pickup_from ?? "—"}
                                    />
                                    <InfoRow
                                        label="Supplier phone"
                                        value={request.supplier_phone ?? "—"}
                                        mono
                                    />
                                </Panel>
                            </div>

                            <div className="space-y-4">
                                <Panel title="What" icon={CalendarDays}>
                                    <p className="whitespace-pre-line py-2 text-sm">
                                        {request.what}
                                    </p>
                                </Panel>

                                <Panel title="Schedule" icon={Repeat}>
                                    <InfoRow
                                        label="Frequency"
                                        value={
                                            options.frequencies[
                                                request.frequency
                                            ] ?? request.frequency
                                        }
                                    />
                                    {request.scheduled_for && (
                                        <InfoRow
                                            label="Scheduled for"
                                            value={fmtDateOnly(
                                                request.scheduled_for,
                                            )}
                                        />
                                    )}
                                    {request.parent && (
                                        <InfoRow
                                            label="Parent series"
                                            value={
                                                <Link
                                                    href={route(
                                                        "admin.supply-requests.show",
                                                        request.parent.id,
                                                    )}
                                                    className="hover:underline"
                                                >
                                                    #{request.parent.id}
                                                </Link>
                                            }
                                        />
                                    )}
                                    <InfoRow
                                        label="Created"
                                        value={fmtDate(request.created_at)}
                                    />
                                    <InfoRow
                                        label="Updated"
                                        value={fmtDate(request.updated_at)}
                                    />
                                </Panel>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ============ Payments ============ */}
                    <TabsContent value="payments">
                        {request.payments.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-sidebar-border/70 p-8 text-center text-sm text-muted-foreground">
                                {request.quoted_amount === null
                                    ? "Quote this request to start accepting payments."
                                    : "No payments recorded yet."}
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
                                        {request.payments.map((pay) => (
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
                                                            {pay.reference ??
                                                                "—"}
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

                    {/* ============ Occurrences ============ */}
                    {request.occurrences.length > 0 && (
                        <TabsContent value="occurrences">
                            <div className="rounded-xl border border-sidebar-border/70 bg-card p-4">
                                <ul className="divide-y divide-sidebar-border/40 text-sm">
                                    {request.occurrences.map((occ) => (
                                        <li
                                            key={occ.id}
                                            className="flex items-center justify-between py-2"
                                        >
                                            <Link
                                                href={route(
                                                    "admin.supply-requests.show",
                                                    occ.id,
                                                )}
                                                className="font-mono text-xs hover:underline"
                                            >
                                                {fmtDateOnly(occ.scheduled_for)}
                                            </Link>
                                            <div className="flex items-center gap-2">
                                                <StatusPill
                                                    status={occ.status}
                                                />
                                                {occ.quoted_amount !== null && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {money(
                                                            occ.quoted_amount,
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </div>

            {/* ---------------- modals ---------------- */}

            {modal?.kind === "record-payment" && (
                <RecordSupplyPaymentModal
                    open
                    onClose={onClose}
                    supplyId={request.id}
                    balanceDue={request.balance_due}
                />
            )}

            {modal?.kind === "stk" && (
                <SupplyStkModal
                    open
                    onClose={onClose}
                    supplyId={request.id}
                    balanceDue={request.balance_due}
                    defaultPhone={request.phone}
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
    breadcrumbs: [
        { title: "Supply requests", href: "/admin/supply-requests" },
        { title: "Details", href: "#" },
    ],
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
