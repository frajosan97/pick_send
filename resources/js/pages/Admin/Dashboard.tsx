// resources/js/pages/Admin/Dashboard.tsx
import { Head, router, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";
import {
    BarChart,
    Donut,
    Funnel,
    Kpi,
    LineChart,
} from "@/components/admin/charts";
import { toDateOnly } from "@/lib/date";
import { densifySeries, type SeriesPoint } from "@/lib/series";

/* ---------- types ---------- */
type Range = { from: string; to: string };

type Kpis = {
    parcels_total: number;
    parcels_paid: number;
    parcels_delivered: number;
    parcels_returned: number;
    parcels_in_flight: number;

    // New names from AdminReportService
    booked_revenue: number;
    collected: number;
    collected_delivery: number;
    cod_collected: number;
    cod_fees: number;
    pack_fees: number;

    new_users: number;
    new_merchants: number;
    wallet_liability: number;
    points_outstanding: number;
};

type TownRow = {
    town: string;
    route: string;
    parcels: number;
    revenue: number;
};
type MerchantRow = {
    id: number;
    name: string;
    phone: string;
    parcels: number;
    cod: number;
    wallet: number;
};
type FunnelRow = { status: string; count: number };
type PaymentRow = {
    type: string;
    status: string;
    count: number;
    amount: number;
};
type SupplyRow = { frequency: string; status: string; count: number };
type WalletRow = {
    type: string;
    count: number;
    credits: number;
    debits: number;
    net: number;
};

type Report = {
    range: Range;
    kpis: Kpis;
    series: SeriesPoint[];
    towns: TownRow[];
    merchants: MerchantRow[];
    funnel: FunnelRow[];
    payments: PaymentRow[];
    supplies: SupplyRow[];
    wallet: WalletRow[];
};

type RangeKey = "today" | "7d" | "30d" | "90d" | "mtd" | "ytd";

const fmt = (n: number) => "KSh " + Math.round(n).toLocaleString("en-KE");
const num = (n: number) => Math.round(n).toLocaleString("en-KE");

const RANGE_LABELS: [RangeKey, string][] = [
    ["today", "Today"],
    ["7d", "Last 7 days"],
    ["30d", "Last 30 days"],
    ["90d", "Last 90 days"],
    ["mtd", "Month to date"],
    ["ytd", "Year to date"],
];

const PAYMENT_PALETTE: Record<string, string> = {
    delivery: "#4FD1C0",
    cod: "#E3B04B",
};

const WALLET_PALETTE: Record<string, string> = {
    cod_credit: "#4FD1C0",
    withdrawal: "#F08A5D",
    points_redeem: "#A78BFA",
};

export default function Dashboard({
    report,
    preset: initialPreset,
}: {
    report: Report;
    preset?: RangeKey;
}) {
    const [preset, setPreset] = useState<RangeKey>(initialPreset ?? "30d");

    const changeRange = (key: RangeKey) => {
        setPreset(key);
        router.get(
            "/admin/dashboard",
            { range: key },
            { preserveScroll: true, preserveState: true },
        );
    };

    const { kpis, towns, merchants, funnel, payments, supplies, wallet } =
        report;

    /* -------- densified series: one point per day, sorted, zero-filled ----- */
    const series = useMemo(
        () =>
            densifySeries(
                report.series,
                toDateOnly(report.range.from),
                toDateOnly(report.range.to),
            ),
        [report.series, report.range.from, report.range.to],
    );

    const labels = series.map((s) => s.date);
    const parcelValues = series.map((s) => s.parcels);
    const bookedRevenueValues = series.map((s) => s.booked_revenue);
    const collectedValues = series.map((s) => s.collected);

    const paymentDonut = useMemo(() => {
        const map = new Map<string, number>();
        payments.forEach((p) =>
            map.set(p.type, (map.get(p.type) ?? 0) + p.amount),
        );
        return [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({
                label,
                value,
                color: PAYMENT_PALETTE[label] ?? "#94a3b8",
            }));
    }, [payments]);

    /**
     * Wallet donut: use absolute `net` so credits and debits don't cancel.
     * If you want to show gross flows instead, add a second Donut with
     * credits/debits per type.
     */
    const walletDonut = useMemo(() => {
        const map = new Map<string, number>();
        wallet.forEach((w) =>
            map.set(w.type, (map.get(w.type) ?? 0) + Math.abs(w.net)),
        );
        return [...map.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({
                label,
                value,
                color: WALLET_PALETTE[label] ?? "#94a3b8",
            }));
    }, [wallet]);

    const supplyGroups = useMemo(() => {
        const map = new Map<string, { status: string; count: number }[]>();
        supplies.forEach((s) => {
            if (!map.has(s.frequency)) map.set(s.frequency, []);
            map.get(s.frequency)!.push({ status: s.status, count: s.count });
        });
        return [...map.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([frequency, rows]) => ({
                frequency,
                rows: rows.sort((a, b) => b.count - a.count),
            }));
    }, [supplies]);

    /* -------- single source of truth for the range header -------- */
    const from = toDateOnly(report.range.from);
    const to = toDateOnly(report.range.to);

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {/* range picker */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                        {RANGE_LABELS.map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => changeRange(key)}
                                className={`rounded-lg border px-3 py-1.5 text-[.82rem] font-semibold transition ${
                                    preset === key
                                        ? "border-ps-brand bg-ps-brand text-ps-onbrand"
                                        : "border-sidebar-border bg-card hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <span className="text-[.82rem] text-neutral-500 dark:text-neutral-400">
                        {from} → {to}
                    </span>
                </div>

                {/* primary KPIs */}
                <div className="grid auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Kpi
                        label="Booked revenue"
                        value={fmt(kpis.booked_revenue)}
                        hint={`${num(kpis.parcels_paid)} paid · ${num(kpis.parcels_total)} booked`}
                        trend={bookedRevenueValues}
                        tone="brand"
                    />
                    <Kpi
                        label="Collected (M-PESA)"
                        value={fmt(kpis.collected)}
                        hint={`Delivery ${fmt(kpis.collected_delivery)} · COD ${fmt(kpis.cod_collected)}`}
                    />
                    <Kpi
                        label="In flight"
                        value={num(kpis.parcels_in_flight)}
                        hint={`${num(kpis.parcels_delivered)} delivered · ${num(kpis.parcels_returned)} returned`}
                    />
                    <Kpi
                        label="Wallet liability"
                        value={fmt(kpis.wallet_liability)}
                        hint={`${num(kpis.points_outstanding)} points outstanding`}
                        tone="warn"
                    />
                </div>

                {/* secondary KPIs */}
                <div className="grid auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Kpi
                        label="New users"
                        value={num(kpis.new_users)}
                        hint={`${num(kpis.new_merchants)} merchants`}
                    />
                    <Kpi
                        label="Packaging fees"
                        value={fmt(kpis.pack_fees)}
                        hint="Collected from senders"
                    />
                    <Kpi
                        label="COD fees (1.6%)"
                        value={fmt(kpis.cod_fees)}
                        hint="Our cut on COD"
                    />
                    <Kpi
                        label="Collected COD"
                        value={fmt(kpis.cod_collected)}
                        hint="Paid by recipients"
                    />
                </div>

                {/* time series */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <h3 className="mb-3 text-[1rem] font-bold">
                            Parcels per day
                        </h3>
                        <BarChart labels={labels} values={parcelValues} />
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <h3 className="mb-3 text-[1rem] font-bold">
                            Booked revenue vs collected
                        </h3>
                        <LineChart
                            labels={labels}
                            series={[
                                {
                                    name: "Booked",
                                    values: bookedRevenueValues,
                                    color: "#4FD1C0",
                                },
                                {
                                    name: "Collected",
                                    values: collectedValues,
                                    color: "#E3B04B",
                                },
                            ]}
                        />
                    </div>
                </div>

                {/* funnel + donuts */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <h3 className="mb-3 text-[1rem] font-bold">
                            Parcel funnel
                        </h3>
                        <Funnel stages={funnel} />
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <h3 className="mb-3 text-[1rem] font-bold">
                            Money by payment type
                        </h3>
                        {paymentDonut.length ? (
                            <Donut data={paymentDonut} />
                        ) : (
                            <p className="text-[.88rem] text-neutral-500">
                                No payments in this range.
                            </p>
                        )}
                    </div>
                </div>

                {/* tables */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                        <div className="border-b border-sidebar-border/70 px-4 py-3 dark:border-sidebar-border">
                            <h3 className="text-[1rem] font-bold">Top towns</h3>
                        </div>
                        <table className="w-full border-collapse text-[.88rem] tabular-nums">
                            <thead>
                                <tr className="text-left text-[.78rem] tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                                    <th className="px-4 py-2">Town</th>
                                    <th className="px-4 py-2">Route</th>
                                    <th className="px-4 py-2 text-right">
                                        Parcels
                                    </th>
                                    <th className="px-4 py-2 text-right">
                                        Revenue
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {towns.slice(0, 12).map((t) => (
                                    <tr
                                        key={t.town}
                                        className="border-t border-sidebar-border/70 dark:border-sidebar-border"
                                    >
                                        <td className="px-4 py-2 font-semibold">
                                            {t.town}
                                        </td>
                                        <td className="px-4 py-2 text-neutral-500 dark:text-neutral-400">
                                            {t.route}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {num(t.parcels)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {fmt(t.revenue)}
                                        </td>
                                    </tr>
                                ))}
                                {!towns.length && (
                                    <tr>
                                        <td
                                            colSpan={4}
                                            className="px-4 py-4 text-center text-neutral-500"
                                        >
                                            No parcels in this range.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-sidebar-border/70 bg-card dark:border-sidebar-border">
                        <div className="border-b border-sidebar-border/70 px-4 py-3 dark:border-sidebar-border">
                            <h3 className="text-[1rem] font-bold">
                                Top merchants
                            </h3>
                        </div>
                        <table className="w-full border-collapse text-[.88rem] tabular-nums">
                            <thead>
                                <tr className="text-left text-[.78rem] tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                                    <th className="px-4 py-2">Merchant</th>
                                    <th className="px-4 py-2">Phone</th>
                                    <th className="px-4 py-2 text-right">
                                        Parcels
                                    </th>
                                    <th className="px-4 py-2 text-right">
                                        COD
                                    </th>
                                    <th className="px-4 py-2 text-right">
                                        Wallet
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {merchants.map((m) => (
                                    <tr
                                        key={m.id}
                                        className="border-t border-sidebar-border/70 dark:border-sidebar-border"
                                    >
                                        <td className="px-4 py-2 font-semibold">
                                            {m.name}
                                        </td>
                                        <td className="px-4 py-2 font-mono text-[.82rem]">
                                            {m.phone}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {num(m.parcels)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {fmt(m.cod)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {fmt(m.wallet)}
                                        </td>
                                    </tr>
                                ))}
                                {!merchants.length && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-4 text-center text-neutral-500"
                                        >
                                            No merchant activity in this range.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* wallets + supplies */}
                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <h3 className="mb-3 text-[1rem] font-bold">
                            Wallet activity (net)
                        </h3>
                        {walletDonut.length ? (
                            <Donut data={walletDonut} />
                        ) : (
                            <p className="text-[.88rem] text-neutral-500">
                                No wallet activity in this range.
                            </p>
                        )}
                    </div>

                    <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
                        <h3 className="mb-3 text-[1rem] font-bold">
                            Supply requests
                        </h3>
                        {supplyGroups.length ? (
                            <div className="flex flex-col gap-3">
                                {supplyGroups.map(({ frequency, rows }) => (
                                    <div key={frequency}>
                                        <b className="mb-1 block text-[.9rem] capitalize">
                                            {frequency}
                                        </b>
                                        <div className="flex flex-wrap gap-2">
                                            {rows.map((r) => (
                                                <span
                                                    key={r.status}
                                                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[.78rem] font-semibold capitalize dark:bg-neutral-800"
                                                >
                                                    {r.status.replace(
                                                        /_/g,
                                                        " ",
                                                    )}
                                                    <b className="tabular-nums">
                                                        {r.count}
                                                    </b>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[.88rem] text-neutral-500">
                                No supply requests in this range.
                            </p>
                        )}
                    </div>
                </div>

                <p className="text-[.78rem] text-neutral-500 dark:text-neutral-400">
                    Numbers are live from the database. Range filter reloads
                    server-side data.
                </p>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: "Dashboard", href: "/admin/dashboard" }],
};
