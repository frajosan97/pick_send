// resources/js/pages/Admin/Points/Index.tsx
import { Head, Link, router } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import SharedDataTable, { Column } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { num } from "@/components/admin/money";
import { ArrowDown, ArrowUp, Coins, Eye } from "lucide-react";

type PointRow = {
    user_id: number;
    name: string;
    email: string;
    phone: string | null;
    balance: number;
    earned: number;
    redeemed: number;
    lost: number;
    last_activity_at: string | null;
};

type Filters = {
    q: string | null;
    from: string | null;
    to: string | null;
    sort: "balance" | "earned" | "redeemed" | "user";
    dir: "asc" | "desc";
};

type Props = {
    rows: PointRow[];
    totals: { balance: number; earned: number; redeemed: number; lost: number };
    orphans: { entries: number; points: number };
    filters: Filters;
    options: { sorts: Record<string, string> };
};

const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleString("en-KE") : "—";

function StatCard({
    label,
    value,
    tone = "default",
}: {
    label: string;
    value: string;
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
            </div>
        </div>
    );
}

export default function Index({
    rows,
    totals,
    orphans,
    filters,
    options,
}: Props) {
    const [q, setQ] = useState(filters.q ?? "");

    useEffect(() => {
        setQ(filters.q ?? "");
    }, [filters.q]);

    const apply = useCallback(
        (patch: Partial<Filters>) => {
            router.get(
                route("admin.points.index"),
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
        router.get(route("admin.points.index"), {}, { replace: true });
    }, []);

    const toggleSort = useCallback(
        (field: Filters["sort"]) => {
            if (filters.sort === field) {
                apply({ dir: filters.dir === "asc" ? "desc" : "asc" });
            } else {
                apply({ sort: field, dir: "desc" });
            }
        },
        [apply, filters.sort, filters.dir],
    );

    const activeFilterCount = useMemo(
        () =>
            [filters.q, filters.from, filters.to].filter(
                (v) => v !== null && v !== undefined,
            ).length,
        [filters],
    );

    // Client-side DataTables — all rows shipped in one go.
    // Server-side sort is applied via the filter bar's Sort column
    // buttons; DataTables also allows clicking headers, but its sort
    // is client-only and can disagree with the server. Disable header
    // ordering for numeric columns to avoid confusion.
    const tableOptions = useMemo(
        () => ({
            order: [],
            pageLength: 25,
            columnDefs: [{ targets: "_all", orderable: false }],
        }),
        [],
    );

    const SortChip = ({
        field,
        label,
    }: {
        field: Filters["sort"];
        label: string;
    }) => {
        const active = filters.sort === field;
        return (
            <button
                type="button"
                onClick={() => toggleSort(field)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                    active
                        ? "bg-card text-foreground shadow-sm ring-1 ring-sidebar-border"
                        : "text-muted-foreground hover:bg-neutral-100 dark:hover:bg-neutral-800"
                }`}
            >
                {label}
                {active &&
                    (filters.dir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                    ) : (
                        <ArrowDown className="h-3 w-3" />
                    ))}
            </button>
        );
    };

    return (
        <>
            <Head title="Points" />
            <div className="space-y-4 p-6">
                {/* header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Coins className="h-6 w-6 text-muted-foreground" />
                            Points
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Loyalty balances per user, aggregated from the point
                            ledger.
                        </p>
                    </div>
                </div>

                {/* totals */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Outstanding balance"
                        value={num(totals.balance)}
                        tone={totals.balance > 0 ? "success" : "default"}
                    />
                    <StatCard
                        label="Earned"
                        value={num(totals.earned)}
                        tone="success"
                    />
                    <StatCard
                        label="Redeemed"
                        value={num(totals.redeemed)}
                        tone="warning"
                    />
                    <StatCard
                        label="Expired / reversed"
                        value={num(totals.lost)}
                        tone="danger"
                    />
                </div>

                {/* orphans warning */}
                {orphans.entries > 0 && (
                    <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-200">
                        <strong>{orphans.entries}</strong> ledger{" "}
                        {orphans.entries === 1 ? "entry has" : "entries have"}{" "}
                        no matching user ({num(orphans.points)} points). These
                        are excluded from the per-user totals above. Likely
                        caused by phone number changes after points were earned.
                    </div>
                )}

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
                            placeholder="Name / email / phone"
                            className="w-64 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        />
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

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                            Sort
                        </span>
                        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-sidebar-border/70 bg-neutral-50 p-1 dark:bg-neutral-800/50">
                            <SortChip field="balance" label="Balance" />
                            <SortChip field="earned" label="Earned" />
                            <SortChip field="redeemed" label="Redeemed" />
                            <SortChip field="user" label="Name" />
                        </div>
                    </div>

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

                {/* table */}
                <SharedDataTable
                    data={rows}
                    className="display w-full"
                    options={tableOptions}
                >
                    <Column title="Name" data="name">
                        {(_v, _t, row: PointRow) => (
                            <div>
                                <Link
                                    href={route(
                                        "admin.users.show",
                                        row.user_id,
                                    )}
                                    className="font-semibold hover:underline"
                                >
                                    {row.name}
                                </Link>
                                <div className="text-xs text-muted-foreground">
                                    {row.email}
                                </div>
                            </div>
                        )}
                    </Column>

                    <Column title="Phone" data="phone">
                        {(v: string | null) => (
                            <span className="font-mono text-xs">
                                {v ?? "—"}
                            </span>
                        )}
                    </Column>

                    <Column title="Balance" data="balance">
                        {(v: number) => (
                            <span
                                className={`tabular-nums text-sm font-semibold ${
                                    v > 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-muted-foreground"
                                }`}
                            >
                                {num(v)}
                            </span>
                        )}
                    </Column>

                    <Column title="Earned" data="earned">
                        {(v: number) => (
                            <span className="tabular-nums text-sm text-emerald-600 dark:text-emerald-400">
                                {num(v)}
                            </span>
                        )}
                    </Column>

                    <Column title="Redeemed" data="redeemed">
                        {(v: number) => (
                            <span className="tabular-nums text-sm text-amber-600 dark:text-amber-400">
                                {num(v)}
                            </span>
                        )}
                    </Column>

                    <Column title="Lost" data="lost">
                        {(v: number) => (
                            <span className="tabular-nums text-sm text-rose-600 dark:text-rose-400">
                                {v > 0 ? num(v) : "—"}
                            </span>
                        )}
                    </Column>

                    <Column title="Last activity" data="last_activity_at">
                        {(v: string | null) => (
                            <span className="text-xs text-muted-foreground">
                                {fmtDate(v)}
                            </span>
                        )}
                    </Column>

                    <Column
                        title="Actions"
                        data="user_id"
                        options={{ orderable: false, searchable: false }}
                    >
                        {(_id, _t, row: PointRow) => (
                            <Button
                                asChild
                                size="icon"
                                variant="outline"
                                className="h-7 w-7"
                            >
                                <Link
                                    href={route(
                                        "admin.users.show",
                                        row.user_id,
                                    )}
                                    aria-label={`Open ${row.name}`}
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                </Link>
                            </Button>
                        )}
                    </Column>
                </SharedDataTable>
            </div>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: "Points", href: "/admin/points" }],
};
