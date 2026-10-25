// resources/js/pages/Admin/Users/Show.tsx
import { Head, Link, router } from "@inertiajs/react";
import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/admin/status-pill";
import { money, num } from "@/components/admin/money";
import { FlashBanner } from "@/components/admin/flash-banner";
import {
    ArrowLeft,
    Building2,
    CalendarDays,
    Mail,
    Phone,
    ShieldCheck,
    Wallet,
} from "lucide-react";

/* ============================================================
 | Types
 * ============================================================ */

type Role = "admin" | "merchant" | "staff" | "customer" | string;

type UserDetail = {
    id: number;
    name: string;
    email: string;
    email_verified: boolean;
    phone: string | null;
    phone_verified: boolean;
    business_name: string | null;
    roles: Role[];
    wallet_balance: number;
    created_at: string | null;
    two_factor: boolean;
};

type Recipient = { id: number; name: string; phone: string | null };
type Parcel = {
    id: number;
    tracking_no: string;
    status: string;
    total: number;
};

// Updated to match the new backend payload
type MerchantOrder = {
    id: number;
    tracking_no: string | null;
    recipient_name: string | null;
    status: string | null;
    total: number;
};

type SupplyReq = { id: number; status: string };
type Payment = {
    id: number;
    type: string;
    status: string;
    amount: number;
    reference: string | null;
    created_at: string | null;
};
type Event = { id: number; status: string; created_at: string | null };

type Props = {
    user: UserDetail;
    recipients: Recipient[];
    parcels: Parcel[];
    merchant_orders: MerchantOrder[];
    supply_requests: SupplyReq[];
    payments: Payment[];
    parcel_events: Event[];
    statsCardData?: {
        label: string;
        value: string;
        hint?: string;
        tone?: "default" | "success" | "danger" | "warning";
    }[];
};

const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("en-KE") : "—";

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

const ROLE_TONE: Record<string, string> = {
    admin: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    merchant:
        "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
    staff: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    customer:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
};

function RoleBadge({ role }: { role: string }) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[.68rem] font-semibold uppercase tracking-wide ${
                ROLE_TONE[role] ??
                "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
            }`}
        >
            {role}
        </span>
    );
}

function EmptyState({ label }: { label: string }) {
    return (
        <div className="rounded-xl border border-dashed border-sidebar-border/70 p-8 text-center text-sm text-muted-foreground">
            {label}
        </div>
    );
}

/* ============================================================
 | Page
 * ============================================================ */

export default function Show({
    user,
    recipients,
    parcels,
    merchant_orders,
    supply_requests,
    payments,
    parcel_events,
    statsCardData,
}: Props) {
    const [activeTab, setActiveTab] = useState("overview");

    const has = useCallback(
        (r: string) => user.roles.includes(r),
        [user.roles],
    );

    // Which activity sections this user's role should surface.
    const showRecipients = has("admin") || has("staff") || has("customer");
    const showParcels = has("admin") || has("staff") || has("customer");
    const showOrders = has("admin") || has("merchant");
    const showSupply = has("admin") || has("merchant");
    const showPayments = has("admin") || has("merchant") || has("customer");
    const showEvents = has("admin") || has("staff");

    const derivedStats = useMemo(() => {
        if (statsCardData && statsCardData.length > 0) return statsCardData;

        const stats: Props["statsCardData"] = [
            {
                label: "Wallet",
                value: money(user.wallet_balance),
                hint: "Available balance",
                tone: user.wallet_balance > 0 ? "success" : "default",
            },
        ];

        if (showParcels) {
            stats.push({
                label: "Parcels",
                value: num(parcels.length),
                hint: "Sent",
            });
        }
        if (showOrders) {
            stats.push({
                label: "Orders",
                value: num(merchant_orders.length),
                hint: "Merchant",
            });
        }
        if (showPayments) {
            const paid = payments
                .filter((p) => p.status === "success")
                .reduce((sum, p) => sum + p.amount, 0);
            stats.push({
                label: "Paid",
                value: money(paid),
                hint: `${payments.filter((p) => p.status === "success").length} successful`,
                tone: "success",
            });
        }
        if (showSupply) {
            stats.push({
                label: "Supply requests",
                value: num(supply_requests.length),
                hint: "Merchant",
            });
        }
        return stats;
    }, [
        statsCardData,
        user.wallet_balance,
        parcels,
        merchant_orders,
        payments,
        supply_requests,
        showParcels,
        showOrders,
        showPayments,
        showSupply,
    ]);

    return (
        <>
            <Head title={user.name} />
            <div className="space-y-4 p-6">
                <FlashBanner />

                {/* ---------------- header ---------------- */}
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                    {/* left: title + meta */}
                    <div className="min-w-0">
                        <nav className="text-xs font-semibold uppercase text-muted-foreground">
                            <Link
                                href={route("admin.users.index", {
                                    role: "admin_staff",
                                })}
                                className="hover:underline"
                            >
                                Users
                            </Link>{" "}
                            <span className="opacity-50">/</span> {user.name}
                        </nav>
                        <h1 className="mt-1 flex flex-wrap items-center gap-3 text-2xl font-bold">
                            <span>{user.name}</span>
                            <div className="flex flex-wrap gap-1">
                                {user.roles.length ? (
                                    user.roles.map((r) => (
                                        <RoleBadge key={r} role={r} />
                                    ))
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        No roles
                                    </span>
                                )}
                                {user.two_factor && (
                                    <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[.68rem] font-semibold uppercase tracking-wide text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
                                        <ShieldCheck className="mr-1 h-3 w-3" />
                                        2FA
                                    </span>
                                )}
                            </div>
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>Joined {fmtDate(user.created_at)}</span>
                            <span aria-hidden>·</span>
                            <span>
                                <Mail className="mr-1 inline h-3 w-3" />
                                {user.email}
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                                <Phone className="mr-1 inline h-3 w-3" />
                                {user.phone ?? "—"}
                            </span>
                        </div>
                    </div>

                    {/* right: actions */}
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Button variant="outline" size="sm" asChild>
                            <Link
                                href={route("admin.users.index", {
                                    role: "admin_staff",
                                })}
                            >
                                <ArrowLeft className="mr-1 h-4 w-4" />
                                Back
                            </Link>
                        </Button>
                        {has("admin") && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    router.get(
                                        route("admin.users.index", {
                                            role: "admin",
                                        }),
                                    )
                                }
                            >
                                All admins
                            </Button>
                        )}
                        {has("staff") && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    router.get(
                                        route("admin.users.index", {
                                            role: "staff",
                                        }),
                                    )
                                }
                            >
                                All staff
                            </Button>
                        )}
                    </div>
                </div>

                {/* ---------------- stats cards ---------------- */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {derivedStats!.map((stat) => (
                        <StatsCard
                            key={stat!.label}
                            label={stat!.label}
                            value={stat!.value}
                            hint={stat!.hint}
                            tone={stat!.tone}
                        />
                    ))}
                </div>

                {/* ---------------- tabbed content ---------------- */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        {showRecipients && (
                            <TabsTrigger value="recipients">
                                Recipients ({recipients.length})
                            </TabsTrigger>
                        )}
                        {showParcels && (
                            <TabsTrigger value="parcels">
                                Parcels ({parcels.length})
                            </TabsTrigger>
                        )}
                        {showOrders && (
                            <TabsTrigger value="orders">
                                Orders ({merchant_orders.length})
                            </TabsTrigger>
                        )}
                        {showSupply && (
                            <TabsTrigger value="supply">
                                Supply ({supply_requests.length})
                            </TabsTrigger>
                        )}
                        {showPayments && (
                            <TabsTrigger value="payments">
                                Payments ({payments.length})
                            </TabsTrigger>
                        )}
                        {showEvents && (
                            <TabsTrigger value="events">
                                Events ({parcel_events.length})
                            </TabsTrigger>
                        )}
                    </TabsList>

                    {/* ============ Overview ============ */}
                    <TabsContent value="overview" className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-4">
                                <Panel title="Contact" icon={Mail}>
                                    <InfoRow
                                        label="Email"
                                        value={
                                            <span className="flex items-center justify-end gap-1">
                                                {user.email}
                                                <span
                                                    className={
                                                        user.email_verified
                                                            ? "text-emerald-600"
                                                            : "text-muted-foreground"
                                                    }
                                                >
                                                    {user.email_verified
                                                        ? "✓"
                                                        : "—"}
                                                </span>
                                            </span>
                                        }
                                    />
                                    <InfoRow
                                        label="Phone"
                                        value={
                                            <span className="flex items-center justify-end gap-1">
                                                {user.phone ?? "—"}
                                                <span
                                                    className={
                                                        user.phone_verified
                                                            ? "text-emerald-600"
                                                            : "text-muted-foreground"
                                                    }
                                                >
                                                    {user.phone_verified
                                                        ? "✓"
                                                        : "—"}
                                                </span>
                                            </span>
                                        }
                                        mono
                                    />
                                    {user.business_name && (
                                        <InfoRow
                                            label="Business"
                                            value={
                                                <span className="flex items-center justify-end gap-1">
                                                    <Building2 className="h-3 w-3 text-muted-foreground" />
                                                    {user.business_name}
                                                </span>
                                            }
                                        />
                                    )}
                                </Panel>

                                <Panel title="Wallet" icon={Wallet}>
                                    <InfoRow
                                        label="Balance"
                                        value={money(user.wallet_balance)}
                                    />
                                </Panel>

                                <Panel title="Security" icon={ShieldCheck}>
                                    <InfoRow
                                        label="Email verified"
                                        value={
                                            user.email_verified ? "Yes" : "No"
                                        }
                                    />
                                    <InfoRow
                                        label="Phone verified"
                                        value={
                                            user.phone_verified ? "Yes" : "No"
                                        }
                                    />
                                    <InfoRow
                                        label="Two-factor"
                                        value={
                                            user.two_factor
                                                ? "Enabled"
                                                : "Disabled"
                                        }
                                    />
                                </Panel>
                            </div>

                            <div className="space-y-4">
                                <Panel title="Account" icon={CalendarDays}>
                                    <InfoRow
                                        label="User ID"
                                        value={`#${user.id}`}
                                        mono
                                    />
                                    <InfoRow
                                        label="Roles"
                                        value={
                                            user.roles.length ? (
                                                <span className="flex flex-wrap justify-end gap-1">
                                                    {user.roles.map((r) => (
                                                        <RoleBadge
                                                            key={r}
                                                            role={r}
                                                        />
                                                    ))}
                                                </span>
                                            ) : (
                                                "—"
                                            )
                                        }
                                    />
                                    <InfoRow
                                        label="Joined"
                                        value={fmtDate(user.created_at)}
                                    />
                                </Panel>

                                {showParcels && (
                                    <Panel title="At a glance">
                                        <InfoRow
                                            label="Parcels sent"
                                            value={num(parcels.length)}
                                        />
                                        <InfoRow
                                            label="Recipients"
                                            value={num(recipients.length)}
                                        />
                                    </Panel>
                                )}

                                {showOrders && (
                                    <Panel title="Merchant">
                                        <InfoRow
                                            label="Orders"
                                            value={num(merchant_orders.length)}
                                        />
                                        <InfoRow
                                            label="Supply requests"
                                            value={num(supply_requests.length)}
                                        />
                                    </Panel>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* ============ Recipients ============ */}
                    {showRecipients && (
                        <TabsContent value="recipients">
                            {recipients.length === 0 ? (
                                <EmptyState label="No recipients yet." />
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 bg-card">
                                    <table className="ps-table w-full text-sm">
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>Phone</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recipients.map((r) => (
                                                <tr
                                                    key={r.id}
                                                    className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
                                                >
                                                    <td>{r.name}</td>
                                                    <td className="font-mono text-xs">
                                                        {r.phone ?? "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    )}

                    {/* ============ Parcels ============ */}
                    {showParcels && (
                        <TabsContent value="parcels">
                            {parcels.length === 0 ? (
                                <EmptyState label="No parcels sent yet." />
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 bg-card">
                                    <table className="ps-table w-full text-sm">
                                        <thead>
                                            <tr>
                                                <th>Tracking</th>
                                                <th>Status</th>
                                                <th className="text-right">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parcels.map((p) => (
                                                <tr
                                                    key={p.id}
                                                    className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
                                                >
                                                    <td>
                                                        <Link
                                                            href={route(
                                                                "admin.parcels.show",
                                                                p.id,
                                                            )}
                                                            className="font-mono text-xs font-semibold hover:underline"
                                                        >
                                                            {p.tracking_no}
                                                        </Link>
                                                    </td>
                                                    <td>
                                                        <StatusPill
                                                            status={p.status}
                                                        />
                                                    </td>
                                                    <td className="text-right font-mono">
                                                        {money(p.total)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    )}

                    {/* ============ Merchant orders ============ */}
                    {showOrders && (
                        <TabsContent value="orders">
                            {merchant_orders.length === 0 ? (
                                <EmptyState label="No merchant orders yet." />
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 bg-card">
                                    <table className="ps-table w-full text-sm">
                                        <thead>
                                            <tr>
                                                <th>Parcel (Tracking)</th>
                                                <th>Recipient</th>
                                                <th>Status</th>
                                                <th className="text-right">
                                                    COD Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {merchant_orders.map((o) => (
                                                <tr
                                                    key={o.id}
                                                    className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
                                                >
                                                    <td>
                                                        {/* If we have the tracking_no, we can link directly to the parcel */}
                                                        {o.tracking_no ? (
                                                            <Link
                                                                href={route(
                                                                    "admin.parcels.show",
                                                                    // We pass the tracking number or you can update backend to pass the parcel ID directly
                                                                    // assuming you have a route that accepts tracking_no or id
                                                                    o.tracking_no,
                                                                )}
                                                                className="font-mono text-xs font-semibold hover:underline"
                                                            >
                                                                {o.tracking_no}
                                                            </Link>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-xs">
                                                                Deleted Parcel
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {o.recipient_name ??
                                                            "—"}
                                                    </td>
                                                    <td>
                                                        {o.status ? (
                                                            <StatusPill
                                                                status={
                                                                    o.status
                                                                }
                                                            />
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </td>
                                                    <td className="text-right font-mono font-medium">
                                                        {money(o.total)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    )}

                    {/* ============ Supply requests ============ */}
                    {showSupply && (
                        <TabsContent value="supply">
                            {supply_requests.length === 0 ? (
                                <EmptyState label="No supply requests yet." />
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 bg-card">
                                    <table className="ps-table w-full text-sm">
                                        <thead>
                                            <tr>
                                                <th>Request</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {supply_requests.map((s) => (
                                                <tr
                                                    key={s.id}
                                                    className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
                                                >
                                                    <td className="font-mono text-xs">
                                                        #{s.id}
                                                    </td>
                                                    <td>
                                                        <StatusPill
                                                            status={s.status}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    )}

                    {/* ============ Payments ============ */}
                    {showPayments && (
                        <TabsContent value="payments">
                            {payments.length === 0 ? (
                                <EmptyState label="No payments yet." />
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 bg-card">
                                    <table className="ps-table w-full text-sm">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                                <th>Reference</th>
                                                <th className="text-right">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map((p) => (
                                                <tr
                                                    key={p.id}
                                                    className="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/40"
                                                >
                                                    <td className="whitespace-nowrap text-xs text-muted-foreground">
                                                        {fmtDate(p.created_at)}
                                                    </td>
                                                    <td>
                                                        <span className="rounded bg-neutral-100 px-2 py-0.5 text-[.7rem] font-bold uppercase tracking-wide dark:bg-neutral-800">
                                                            {p.type}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <StatusPill
                                                            status={p.status}
                                                        />
                                                    </td>
                                                    <td className="font-mono text-xs text-muted-foreground">
                                                        {p.reference ?? "—"}
                                                    </td>
                                                    <td className="text-right font-mono font-medium">
                                                        {money(p.amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    )}

                    {/* ============ Events ============ */}
                    {showEvents && (
                        <TabsContent value="events">
                            {parcel_events.length === 0 ? (
                                <EmptyState label="No events recorded." />
                            ) : (
                                <div className="rounded-xl border border-sidebar-border/70 bg-card p-4">
                                    <ol className="relative ml-2 space-y-4 border-l border-sidebar-border/70 pl-5">
                                        {parcel_events.map((e) => (
                                            <li key={e.id} className="relative">
                                                <span className="absolute -left-[26px] mt-1 h-3 w-3 rounded-full border-2 border-card bg-ps-brand" />
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusPill
                                                        status={e.status}
                                                    />
                                                </div>
                                                <div className="mt-0.5 text-xs text-muted-foreground">
                                                    <CalendarDays className="mr-1 inline h-3 w-3" />
                                                    {fmtDate(e.created_at)}
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </TabsContent>
                    )}
                </Tabs>
            </div>
        </>
    );
}

Show.layout = {
    breadcrumbs: [{ title: "Users", href: "/admin/users" }],
};
