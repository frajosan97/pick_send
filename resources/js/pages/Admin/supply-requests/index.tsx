// resources/js/pages/Admin/SupplyRequests/Index.tsx
import { Head, Link, router } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import SharedDataTable, { Column } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/admin/status-pill";
import { RowActions } from "@/components/admin/row-actions";
import { money } from "@/components/admin/money";
import { Eye, Plus, Repeat } from "lucide-react";

type SupplyRequestRow = {
    id: number;
    parent_id: number | null;
    scheduled_for: string | null;
    recurring: boolean;
    name: string;
    phone: string;
    what: string;
    frequency: string;
    status: string;
    pickup_from: string | null;
    supplier_phone: string | null;
    quoted_amount: number | null;
    amount_paid: number;
    balance_due: number;
    town: { id: number; name: string } | null;
    user: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
    } | null;
    created_at: string | null;
    deleted_at: string | null;
};

type Filters = {
    q: string | null;
    status: string | null;
    frequency: string | null;
    from: string | null;
    to: string | null;
    trashed: boolean;
    recurring: boolean;
};

type Props = {
    requests: SupplyRequestRow[];
    filters: Filters;
    options: {
        statuses: Record<string, string>;
        frequencies: Record<string, string>;
    };
};

export default function Index({ requests, filters, options }: Props) {
    const [q, setQ] = useState(filters.q ?? "");

    useEffect(() => {
        setQ(filters.q ?? "");
    }, [filters.q]);

    const apply = useCallback(
        (patch: Partial<Filters>) => {
            router.get(
                route("admin.supply-requests.index"),
                {
                    ...filters,
                    trashed: filters.trashed ? "1" : "0",
                    recurring: filters.recurring ? "1" : "0",
                    ...patch,
                },
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
        router.get(route("admin.supply-requests.index"), {}, { replace: true });
    }, []);

    const activeFilterCount = useMemo(
        () =>
            [
                filters.q,
                filters.status,
                filters.frequency,
                filters.from,
                filters.to,
                filters.trashed ? "1" : null,
                filters.recurring ? "1" : null,
            ].filter((v) => v !== null && v !== undefined).length,
        [filters],
    );

    /*
     * Column layout (10 columns, indices 0–9):
     *   0 Created | 1 Requester | 2 What | 3 Town | 4 Frequency
     *   5 Scheduled | 6 Status | 7 Quoted | 8 Balance | 9 Actions
     *
     * Only "Created" is order-disabled: its value is a formatted
     * string ("21/10/2026, 13:04") that DataTables would otherwise
     * sort lexically, producing an unintuitive order. All other
     * columns hold sortable primitives (numbers / sortable strings),
     * and "Actions" has no meaningful sort value — clicking its
     * header just sorts by the row id, which is harmless.
     */
    const tableOptions = useMemo(
        () => ({
            order: [[0, "desc" as const]],
            pageLength: 25,
            columnDefs: [{ targets: [0], orderable: false, searchable: false }],
        }),
        [],
    );

    return (
        <>
            <Head title="Supply requests" />
            <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">Supply requests</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Pickup and supply requests submitted by customers
                            and merchants.
                        </p>
                    </div>
                    <Button asChild size="sm">
                        <Link href={route("admin.supply-requests.create")}>
                            <Plus className="mr-1 h-4 w-4" />
                            New request
                        </Link>
                    </Button>
                </div>

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
                            placeholder="Name / phone / what / user"
                            className="w-64 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        />
                    </label>

                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        Status
                        <select
                            value={filters.status ?? ""}
                            onChange={(e) =>
                                apply({ status: e.target.value || null })
                            }
                            className="w-40 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
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
                        Frequency
                        <select
                            value={filters.frequency ?? ""}
                            onChange={(e) =>
                                apply({ frequency: e.target.value || null })
                            }
                            className="w-44 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        >
                            <option value="">All</option>
                            {Object.entries(options.frequencies).map(
                                ([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ),
                            )}
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

                    <label className="flex items-center gap-2 rounded-lg border border-sidebar-border/60 bg-neutral-50 px-3 py-1.5 text-sm dark:bg-neutral-800/40">
                        <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={filters.recurring}
                            onChange={(e) =>
                                apply({ recurring: e.target.checked })
                            }
                        />
                        Recurring only
                    </label>

                    <label className="flex items-center gap-2 rounded-lg border border-sidebar-border/60 bg-neutral-50 px-3 py-1.5 text-sm dark:bg-neutral-800/40">
                        <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={filters.trashed}
                            onChange={(e) =>
                                apply({ trashed: e.target.checked })
                            }
                        />
                        Show deleted
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
                    data={requests}
                    className="display w-full"
                    options={tableOptions}
                >
                    {/* 0 — Created */}
                    <Column title="Created" data="created_at">
                        {(v: string | null, _t, row: SupplyRequestRow) => (
                            <div>
                                <div className="text-sm text-muted-foreground">
                                    {v
                                        ? new Date(v).toLocaleString("en-KE")
                                        : "—"}
                                </div>
                                {row.deleted_at && (
                                    <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                                        deleted
                                    </div>
                                )}
                            </div>
                        )}
                    </Column>

                    {/* 1 — Requester */}
                    <Column title="Requester" data="name">
                        {(_v, _t, row: SupplyRequestRow) => (
                            <div>
                                <div className="flex items-center gap-1.5 text-sm font-semibold">
                                    {row.name}
                                    {row.recurring && (
                                        <span
                                            title="Recurring series master"
                                            className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-[.6rem] font-semibold uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                                        >
                                            <Repeat className="h-2.5 w-2.5" />
                                            Series
                                        </span>
                                    )}
                                    {row.parent_id && (
                                        <span className="rounded bg-neutral-200 px-1 text-[.6rem] font-semibold uppercase text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                                            Occurrence
                                        </span>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {row.phone}
                                </div>
                                {row.user && (
                                    <div className="text-xs text-muted-foreground">
                                        Linked: {row.user.name}
                                    </div>
                                )}
                            </div>
                        )}
                    </Column>

                    {/* 2 — What */}
                    <Column title="What" data="what">
                        {(v: string) => (
                            <div
                                className="max-w-xs truncate text-sm"
                                title={v}
                            >
                                {v}
                            </div>
                        )}
                    </Column>

                    {/* 3 — Town */}
                    <Column title="Town" data="town">
                        {(_v, _t, row: SupplyRequestRow) => (
                            <span className="text-sm">
                                {row.town?.name ?? "—"}
                            </span>
                        )}
                    </Column>

                    {/* 4 — Frequency */}
                    <Column title="Frequency" data="frequency">
                        {(v: string) => (
                            <span className="text-sm">
                                {options.frequencies[v] ?? v}
                            </span>
                        )}
                    </Column>

                    {/* 5 — Scheduled */}
                    <Column title="Scheduled" data="scheduled_for">
                        {(v: string | null) => (
                            <span className="text-xs text-muted-foreground">
                                {v
                                    ? new Date(v).toLocaleDateString("en-KE")
                                    : "—"}
                            </span>
                        )}
                    </Column>

                    {/* 6 — Status */}
                    <Column title="Status" data="status">
                        {(v: string) => <StatusPill status={v} />}
                    </Column>

                    {/* 7 — Quoted */}
                    <Column title="Quoted" data="quoted_amount">
                        {(v: number | null) => (
                            <span className="text-sm">
                                {v !== null ? (
                                    money(v)
                                ) : (
                                    <span className="italic text-muted-foreground">
                                        —
                                    </span>
                                )}
                            </span>
                        )}
                    </Column>

                    {/* 8 — Balance */}
                    <Column title="Balance" data="balance_due">
                        {(_v, _t, row: SupplyRequestRow) => {
                            if (row.quoted_amount === null) {
                                return (
                                    <span className="text-xs italic text-muted-foreground">
                                        Not quoted
                                    </span>
                                );
                            }
                            if (row.balance_due <= 0) {
                                return (
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        Paid
                                    </span>
                                );
                            }
                            return (
                                <div className="text-sm">
                                    <div className="font-semibold text-rose-600 dark:text-rose-400">
                                        {money(row.balance_due)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        of {money(row.quoted_amount)}
                                    </div>
                                </div>
                            );
                        }}
                    </Column>

                    {/* 9 — Actions */}
                    <Column
                        title="Actions"
                        data="id"
                        options={{ orderable: false, searchable: false }}
                    >
                        {(_id, _t, row: SupplyRequestRow) => (
                            <RowActions>
                                <Button
                                    asChild
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                >
                                    <Link
                                        href={route(
                                            "admin.supply-requests.show",
                                            row.id,
                                        )}
                                        aria-label={`Open #${row.id}`}
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
    breadcrumbs: [{ title: "Supply requests", href: "/admin/supply-requests" }],
};
