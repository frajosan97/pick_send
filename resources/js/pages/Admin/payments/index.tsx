// resources/js/pages/Admin/Payments/Index.tsx
import { Head, Link, router } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import SharedDataTable, { Column } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { money } from "@/components/admin/money";
import { StatusPill } from "@/components/admin/status-pill";
import { RowActions } from "@/components/admin/row-actions";
import { Eye } from "lucide-react";

type PaymentRow = {
    id: number;
    type: string;
    status: string;
    channel: string;
    method: "mpesa" | "cash";
    amount: number;
    phone: string | null;
    reference: string | null;
    receipt_number: string | null;
    confirmed_at: string | null;
    created_at: string;
    parcel: {
        id: number;
        tracking_no: string;
        recipient_name: string;
        recipient_phone: string;
        status: string;
        payment_option: string;
        total: number;
    } | null;
    user: { id: number; name: string; phone: string | null } | null;
    mpesa_transaction: {
        id: number;
        status: string;
        type: string;
        amount: number;
        phone: string;
        mpesa_receipt_number: string | null;
        checkout_request_id: string | null;
        result_code: string | null;
        result_desc: string | null;
        completed_at: string | null;
    } | null;
};

type Filters = {
    q: string | null;
    type: string | null;
    status: string | null;
    channel: string | null;
    parcel_id: number | null;
    user_id: number | null;
    from: string | null;
    to: string | null;
};

type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
};

type Props = {
    payments: Paginated<PaymentRow>;
    filters: Filters;
    options: {
        types: Record<string, string>;
        statuses: Record<string, string>;
        channels: Record<string, string>;
    };
};

const TYPE_TONE: Record<string, string> = {
    delivery: "text-sky-600 dark:text-sky-400",
    cod: "text-violet-600 dark:text-violet-400",
    withdrawal: "text-amber-600 dark:text-amber-400",
    refund: "text-rose-600 dark:text-rose-400",
    points: "text-emerald-600 dark:text-emerald-400",
};

export default function Index({ payments, filters, options }: Props) {
    const [q, setQ] = useState(filters.q ?? "");

    // keep the search box in sync with the URL
    useEffect(() => {
        setQ(filters.q ?? "");
    }, [filters.q]);

    const apply = useCallback(
        (patch: Partial<Filters>) => {
            router.get(
                route("admin.payments.index"),
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
        router.get(route("admin.payments.index"), {}, { replace: true });
    }, []);

    const activeFilterCount = useMemo(
        () =>
            [
                filters.q,
                filters.type,
                filters.status,
                filters.channel,
                filters.parcel_id,
                filters.user_id,
                filters.from,
                filters.to,
            ].filter((v) => v !== null && v !== undefined).length,
        [filters],
    );

    // Server-side pagination: DataTables is used purely for ordering of
    // the current page. Length changes are pushed to the URL instead.
    const tableOptions = useMemo(
        () => ({
            paging: false, // real paging lives on the server
            info: false,
            order: [],
            columnDefs: [
                { targets: [7], orderable: false, searchable: false }, // Actions
                { targets: [4], type: "num" as const }, // Amount
            ],
        }),
        [],
    );

    return (
        <>
            <Head title="Payments" />
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
                            placeholder="Receipt / reference / phone / tracking"
                            className="w-64 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        />
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        Type
                        <select
                            value={filters.type ?? ""}
                            onChange={(e) =>
                                apply({ type: e.target.value || null })
                            }
                            className="w-36 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        >
                            <option value="">All</option>
                            {Object.entries(options.types).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        Status
                        <select
                            value={filters.status ?? ""}
                            onChange={(e) =>
                                apply({ status: e.target.value || null })
                            }
                            className="w-36 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
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
                        Channel
                        <select
                            value={filters.channel ?? ""}
                            onChange={(e) =>
                                apply({ channel: e.target.value || null })
                            }
                            className="w-36 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        >
                            <option value="">All</option>
                            {Object.entries(options.channels).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
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

                <SharedDataTable
                    data={payments.data}
                    className="display w-full"
                    options={tableOptions}
                >
                    <Column title="Created" data="created_at">
                        {(v: string) => (
                            <span className="text-sm text-muted-foreground">
                                {new Date(v).toLocaleString("en-KE")}
                            </span>
                        )}
                    </Column>

                    <Column title="Parcel" data="parcel">
                        {(_v, _t, row: PaymentRow) =>
                            row.parcel ? (
                                <Link
                                    href={route(
                                        "admin.parcels.show",
                                        row.parcel.id,
                                    )}
                                    className="font-mono text-sm font-semibold hover:underline"
                                >
                                    {row.parcel.tracking_no}
                                </Link>
                            ) : (
                                <span className="text-xs text-muted-foreground">
                                    —
                                </span>
                            )
                        }
                    </Column>

                    <Column title="Type" data="type">
                        {(v: string) => (
                            <span
                                className={`text-sm font-semibold ${
                                    TYPE_TONE[v] ?? ""
                                }`}
                            >
                                {options.types[v] ?? v}
                            </span>
                        )}
                    </Column>

                    <Column title="Status" data="status">
                        {(v: string) => <StatusPill status={v} />}
                    </Column>

                    <Column title="Amount" data="amount">
                        {(v: number) => (
                            <span className="tabular-nums text-sm font-semibold">
                                {money(v)}
                            </span>
                        )}
                    </Column>

                    <Column title="Method / Receipt" data="method">
                        {(_v, _t, row: PaymentRow) => (
                            <div>
                                <div className="text-sm capitalize">
                                    {row.method}
                                </div>
                                <div className="font-mono text-xs text-muted-foreground">
                                    {row.receipt_number ??
                                        row.reference ??
                                        row.phone ??
                                        "—"}
                                </div>
                            </div>
                        )}
                    </Column>

                    <Column title="Payer" data="phone">
                        {(_v, _t, row: PaymentRow) => (
                            <div>
                                <div className="text-sm">
                                    {row.user?.name ??
                                        row.mpesa_transaction?.phone ??
                                        "—"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {row.user?.phone ?? row.phone ?? ""}
                                </div>
                            </div>
                        )}
                    </Column>

                    <Column
                        title="Actions"
                        data="id"
                        options={{ orderable: false, searchable: false }}
                    >
                        {(_id, _t, row: PaymentRow) => (
                            <RowActions>
                                {row.parcel && (
                                    <Button
                                        asChild
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7"
                                    >
                                        <Link
                                            href={route(
                                                "admin.parcels.show",
                                                row.parcel.id,
                                            )}
                                            aria-label={`Open ${row.parcel.tracking_no}`}
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                        </Link>
                                    </Button>
                                )}
                            </RowActions>
                        )}
                    </Column>
                </SharedDataTable>

                {/* server-side pagination */}
                <div className="flex items-center justify-between text-sm">
                    <div className="text-muted-foreground">
                        {payments.total === 0
                            ? "No payments"
                            : `Showing ${payments.from}–${payments.to} of ${payments.total}`}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                        {payments.links.map((l, i) => (
                            <Button
                                key={i}
                                size="sm"
                                variant={l.active ? "default" : "outline"}
                                disabled={!l.url}
                                onClick={() =>
                                    l.url &&
                                    router.get(
                                        l.url,
                                        {},
                                        {
                                            preserveScroll: true,
                                            preserveState: true,
                                            replace: true,
                                        },
                                    )
                                }
                                dangerouslySetInnerHTML={{
                                    __html: l.label,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: "Payments", href: "/admin/payments" }],
};
