// src/pages/merchants/index.tsx
import { Head, Link, router, usePage } from "@inertiajs/react";
import { Wallet, TrendingUp, Clock, Gift, ArrowUpRight } from "lucide-react";
import { fmt } from "@/lib/pricing";
import SharedDataTable, { Column } from "@/components/admin/data-table";
import { StatusPill } from "@/components/admin/status-pill";
import { money } from "@/components/admin/money";
import type {
    AuthUser,
    Flash,
    MerchantData,
} from "@/components/welcome/shared";
import { EYEBROW, H3, PRIMARY, WRAP } from "@/components/welcome/shared";

// Define the Payment type locally
type PaymentRow = {
    id: number;
    created_at: string;
    amount: number;
    type: string;
    status: string;
    reference: string;
};

export default function MerchantsIndex() {
    const { auth, merchant, flash } = usePage<{
        auth: { user: AuthUser | null };
        merchant: (MerchantData & { payments?: PaymentRow[] }) | null;
        flash: Flash;
    }>().props;

    const merchantUser = auth?.user?.is_merchant ? auth.user : null;

    if (!merchantUser) {
        if (typeof window !== "undefined") {
            window.location.href = "/#merchants";
        }
        return null;
    }

    const withdraw = () =>
        router.post("/merchant/withdraw", {}, { preserveScroll: true });

    const kpis = [
        {
            label: "Available Wallet",
            value: fmt(merchant?.wallet ?? 0),
            icon: Wallet,
            trend: "Ready to withdraw",
            main: true,
        },
        {
            label: "Pending Collection",
            value: fmt(merchant?.waiting ?? 0),
            icon: Clock,
            trend: "Waiting for customers",
            main: false,
        },
        {
            label: "Withdrawn (This Month)",
            value: fmt(merchant?.withdrawn_month ?? 0),
            icon: TrendingUp,
            trend: "Lifetime payouts",
            main: false,
        },
        {
            label: "Loyalty Points",
            value: String(merchant?.points ?? 0),
            icon: Gift,
            trend: "1 Pt = KSh 1 off delivery",
            main: false,
        },
    ];

    return (
        <>
            <Head title="Merchant Dashboard" />

            <section className="py-8 py-10 bg-ps-bg min-h-screen">
                <div className={WRAP}>
                    {/* Header Section */}
                    <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-ps-line pb-6">
                        <div>
                            <span className={EYEBROW}>Merchant Dashboard</span>
                            <h1 className="text-[clamp(1.8rem,4vw,2.6rem)] leading-tight font-extrabold text-ps-brandink mt-2">
                                {merchantUser.business_name ??
                                    merchantUser.name}
                            </h1>
                            <p className="text-ps-muted mt-1 max-w-xl text-pretty">
                                Here is an overview of your store's performance,
                                wallet, and recent orders.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={withdraw}
                                disabled={(merchant?.wallet ?? 0) <= 0}
                                className={`${PRIMARY} flex items-center gap-2`}
                            >
                                Withdraw Funds
                                <ArrowUpRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {flash?.withdrawn && (
                        <div className="mb-8 rounded-[14px] bg-ps-soft p-4 border border-ps-line flex items-center gap-3">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                            <p className="text-sm font-semibold text-ps-brandink">
                                Withdrawal sent to your M-PESA
                                {flash.withdraw_receipt
                                    ? ` (Receipt: ${flash.withdraw_receipt})`
                                    : ""}
                                .
                            </p>
                        </div>
                    )}

                    {/* KPI Cards Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
                        {kpis.map((kpi, i) => (
                            <div
                                key={i}
                                className={`flex flex-col gap-1.5 rounded-[18px] border p-5 sm:p-6 ${
                                    kpi.main
                                        ? "border-transparent bg-ps-brand text-ps-onbrand shadow-sm"
                                        : "border-ps-line bg-ps-surface"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span
                                        className={`text-[.9rem] font-semibold ${kpi.main ? "text-ps-onbrand/80" : "text-ps-muted"}`}
                                    >
                                        {kpi.label}
                                    </span>
                                    <kpi.icon
                                        className={`h-5 w-5 ${kpi.main ? "text-ps-onbrand/60" : "text-ps-muted/60"}`}
                                    />
                                </div>
                                <b
                                    className={`text-[clamp(1.4rem,3vw,1.7rem)] leading-tight font-extrabold tabular-nums ${kpi.main ? "text-ps-onbrand" : "text-ps-brandink"}`}
                                >
                                    {kpi.value}
                                </b>
                                <span
                                    className={`text-sm mt-1 ${kpi.main ? "text-ps-onbrand/80" : "text-ps-muted"}`}
                                >
                                    {kpi.trend}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Tables Section */}
                    <div className="space-y-8">
                        {/* Orders Table */}
                        <div className="rounded-[18px] border border-ps-line bg-ps-surface overflow-hidden">
                            <div className="border-b border-ps-line px-4 sm:px-6 py-4 flex justify-between items-center bg-ps-soft/50">
                                <h2
                                    className={`text-[1.05rem] sm:text-[1.1rem] ${H3}`}
                                >
                                    Recent Orders
                                </h2>
                                <Link
                                    href="/merchants/orders"
                                    className="text-sm font-bold text-ps-accent hover:opacity-80"
                                >
                                    View all
                                </Link>
                            </div>
                            <div className="p-0 overflow-x-auto">
                                <SharedDataTable
                                    data={merchant?.orders ?? []}
                                    className="w-full"
                                    options={{
                                        language: {
                                            emptyTable: `
                                                <div class="flex flex-col items-center justify-center py-8 text-center text-ps-muted">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ps-line mb-3">
                                                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
                                                        <path d="m3.3 7 8.7 5 8.7-5"/>
                                                        <path d="M12 22V12"/>
                                                    </svg>
                                                    <p class="text-sm">No orders found yet.</p>
                                                </div>
                                            `,
                                        },
                                    }}
                                >
                                    <Column title="Tracking" data="tracking_no">
                                        {(v: string) => (
                                            <span className="font-mono text-sm font-semibold text-ps-brandink">
                                                {v}
                                            </span>
                                        )}
                                    </Column>
                                    <Column
                                        title="Recipient"
                                        data="recipient_name"
                                    >
                                        {(_v: string, _t: any, row: any) => (
                                            <div>
                                                <div className="text-sm font-semibold text-ps-ink">
                                                    {row.recipient_name}
                                                </div>
                                                <div className="text-xs text-ps-muted">
                                                    {row.town}
                                                </div>
                                            </div>
                                        )}
                                    </Column>
                                    <Column title="Status" data="status">
                                        {(v: string) => (
                                            <StatusPill status={v} />
                                        )}
                                    </Column>
                                    <Column
                                        title="COD Amount"
                                        data="cod_amount"
                                    >
                                        {(v: number) => (
                                            <span className="tabular-nums font-semibold text-ps-brandink">
                                                {fmt(v)}
                                            </span>
                                        )}
                                    </Column>
                                </SharedDataTable>
                            </div>
                        </div>

                        {/* Payments Table */}
                        <div className="rounded-[18px] border border-ps-line bg-ps-surface overflow-hidden">
                            <div className="border-b border-ps-line px-4 sm:px-6 py-4 flex justify-between items-center bg-ps-soft/50">
                                <h2
                                    className={`text-[1.05rem] sm:text-[1.1rem] ${H3}`}
                                >
                                    Payment History
                                </h2>
                            </div>
                            <div className="p-0 overflow-x-auto">
                                <SharedDataTable
                                    data={merchant?.payments ?? []}
                                    className="w-full"
                                    options={{
                                        language: {
                                            emptyTable: `
                                                <div class="flex flex-col items-center justify-center py-8 text-center text-ps-muted">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ps-line mb-3">
                                                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                                                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                                                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                                                    </svg>
                                                    <p class="text-sm">No payment history available.</p>
                                                </div>
                                            `,
                                        },
                                    }}
                                >
                                    <Column title="Date" data="created_at">
                                        {(v: string) => (
                                            <span className="text-sm text-ps-muted">
                                                {new Date(
                                                    v,
                                                ).toLocaleDateString()}
                                            </span>
                                        )}
                                    </Column>
                                    <Column title="Reference" data="reference">
                                        {(v: string) => (
                                            <span className="font-mono text-sm">
                                                {v}
                                            </span>
                                        )}
                                    </Column>
                                    <Column title="Type" data="type">
                                        {(v: string) => (
                                            <span className="capitalize text-sm text-ps-ink">
                                                {v.replace("_", " ")}
                                            </span>
                                        )}
                                    </Column>
                                    <Column title="Status" data="status">
                                        {(v: string) => (
                                            <StatusPill status={v} />
                                        )}
                                    </Column>
                                    <Column title="Amount" data="amount">
                                        {(v: number) => (
                                            <span
                                                className={`tabular-nums font-semibold ${v >= 0 ? "text-ps-accent" : "text-ps-ink"}`}
                                            >
                                                {money(v)}
                                            </span>
                                        )}
                                    </Column>
                                </SharedDataTable>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
