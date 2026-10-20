// resources/js/pages/Admin/Parcels/Index.tsx
import { Head, Link, router } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import SharedDataTable, { Column } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { money, num } from "@/components/admin/money";
import { StatusPill } from "@/components/admin/status-pill";
import { RowActions } from "@/components/admin/row-actions";
import { Eye, RotateCw } from "lucide-react";

type ParcelRow = {
    id: number;
    tracking_no: string;
    sender_name: string;
    recipient_name: string;
    recipient_phone: string;
    town: string | null;
    route: string | null;
    status: string;
    payment_option: string;
    total: number;
    amount_paid: number;
    balance_due: number;
    is_paid: boolean;
    created_at: string;
    paid_at: string | null;
};

type Filters = {
    q: string | null;
    status: string | null;
    payment_option: string | null;
    town_id: number | null;
    from: string | null;
    to: string | null;
};

type Props = {
    parcels: ParcelRow[];
    filters: Filters;
    options: {
        statuses: Record<string, string>;
        payment_options: string[];
        towns: { id: number; name: string }[];
    };
};

const PAYMENT_LABELS: Record<string, string> = {
    prepaid: "Prepaid",
    cod_fee: "COD fee only",
    cod_full: "COD full",
};

export default function Index({ parcels, filters, options }: Props) {
    const [q, setQ] = useState(filters.q ?? "");

    // Keep the input in sync when the URL changes (Reset, back button,
    // direct link with ?q=…). Without this, Reset clears the table but
    // the input keeps the old value.
    useEffect(() => {
        setQ(filters.q ?? "");
    }, [filters.q]);

    const apply = useCallback(
        (patch: Partial<Filters>) => {
            router.get(
                route("admin.parcels.index"),
                { ...filters, ...patch },
                { preserveScroll: true, preserveState: true, replace: true },
            );
        },
        [filters],
    );

    const submitSearch = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            apply({ q: q.trim() || null });
        },
        [apply, q],
    );

    const resetFilters = useCallback(() => {
        setQ("");
        router.get(route("admin.parcels.index"), {}, { replace: true });
    }, []);

    const tableOptions = useMemo(
        () => ({
            order: [[0, "desc" as const]],
            pageLength: 25,
            columnDefs: [
                {
                    targets: [0, 9], // Created, Actions
                    orderable: false,
                    searchable: false,
                },
                {
                    targets: [7, 8, 9], // Total, Paid, Balance
                    type: "num" as const,
                },
            ],
        }),
        [],
    );

    const activeFilterCount = useMemo(
        () =>
            [
                filters.q,
                filters.status,
                filters.payment_option,
                filters.town_id,
                filters.from,
                filters.to,
            ].filter(Boolean).length,
        [filters],
    );

    return (
        <>
            <Head title="Parcels" />
            <div className="space-y-4 p-6">
                {/* filters */}
                <form
                    onSubmit={submitSearch}
                    className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3"
                >
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        Search
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                    setQ("");
                                    apply({ q: null });
                                }
                            }}
                            placeholder="Tracking / phone"
                            className="w-56 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        />
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        Status
                        <select
                            value={filters.status ?? ""}
                            onChange={(e) =>
                                apply({ status: e.target.value || null })
                            }
                            className="w-44 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        >
                            <option value="">All</option>
                            {Object.entries(options.statuses).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        Payment
                        <select
                            value={filters.payment_option ?? ""}
                            onChange={(e) =>
                                apply({
                                    payment_option: e.target.value || null,
                                })
                            }
                            className="w-40 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        >
                            <option value="">All</option>
                            {options.payment_options.map((p) => (
                                <option key={p} value={p}>
                                    {PAYMENT_LABELS[p] ?? p}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        Town
                        <select
                            value={filters.town_id ?? ""}
                            onChange={(e) =>
                                apply({
                                    town_id: Number(e.target.value) || null,
                                })
                            }
                            className="w-44 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        >
                            <option value="">All</option>
                            {options.towns.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        From
                        <input
                            type="date"
                            value={filters.from ?? ""}
                            onChange={(e) =>
                                apply({ from: e.target.value || null })
                            }
                            className="rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        />
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        To
                        <input
                            type="date"
                            value={filters.to ?? ""}
                            onChange={(e) =>
                                apply({ to: e.target.value || null })
                            }
                            className="rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        />
                    </label>

                    <Button type="submit">Apply</Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={resetFilters}
                        disabled={activeFilterCount === 0 && !q}
                    >
                        Reset
                    </Button>
                </form>

                <SharedDataTable data={parcels} className="display w-full">
                    <Column title="Created" data="created_at">
                        {(v: string) => (
                            <span className="text-sm text-muted-foreground">
                                {new Date(v).toLocaleString("en-KE")}
                            </span>
                        )}
                    </Column>

                    <Column title="Tracking" data="tracking_no">
                        {(v: string, _t, row: ParcelRow) => (
                            <Link
                                href={route("admin.parcels.show", row.id)}
                                className="font-mono text-sm font-semibold hover:underline"
                            >
                                {v}
                            </Link>
                        )}
                    </Column>

                    <Column title="Sender" data="sender_name" />

                    <Column title="Recipient" data="recipient_phone">
                        {(_v: string, _t, row: ParcelRow) => (
                            <div>
                                <div className="text-sm font-semibold">
                                    {row.recipient_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {row.recipient_phone}
                                </div>
                            </div>
                        )}
                    </Column>

                    <Column title="Town" data="town">
                        {(_v: string | null, _t, row: ParcelRow) => (
                            <div>
                                <div className="text-sm">{row.town ?? "—"}</div>
                                <div className="text-xs text-muted-foreground">
                                    {row.route ?? ""}
                                </div>
                            </div>
                        )}
                    </Column>

                    <Column title="Status" data="status">
                        {(v: string) => <StatusPill status={v} />}
                    </Column>

                    <Column title="Payment" data="payment_option">
                        {(v: string) => (
                            <span className="text-sm text-muted-foreground">
                                {PAYMENT_LABELS[v] ?? v}
                            </span>
                        )}
                    </Column>

                    <Column title="Total" data="total">
                        {(v: number) => (
                            <span className="tabular-nums text-sm">
                                {money(v)}
                            </span>
                        )}
                    </Column>

                    <Column title="Paid" data="amount_paid">
                        {(v: number) => (
                            <span className="tabular-nums text-sm">
                                {money(v)}
                            </span>
                        )}
                    </Column>

                    <Column title="Balance" data="balance_due">
                        {(v: number) => (
                            <span
                                className={`tabular-nums text-sm font-semibold ${
                                    v > 0
                                        ? "text-rose-600 dark:text-rose-400"
                                        : "text-emerald-600 dark:text-emerald-400"
                                }`}
                            >
                                {money(v)}
                            </span>
                        )}
                    </Column>

                    <Column
                        title="Actions"
                        data="id"
                        options={{
                            orderable: false,
                            searchable: false,
                        }}
                    >
                        {(_id: number, _t, row: ParcelRow) => (
                            <RowActions>
                                <Button
                                    asChild
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                >
                                    <Link
                                        href={route(
                                            "admin.parcels.show",
                                            row.id,
                                        )}
                                        aria-label={`Open ${row.tracking_no}`}
                                    >
                                        <Eye className="h-3.5 w-3.5" />
                                    </Link>
                                </Button>
                            </RowActions>
                        )}
                    </Column>
                </SharedDataTable>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: "Parcels", href: "/admin/parcels" }],
};
