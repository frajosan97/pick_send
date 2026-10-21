// resources/js/pages/Admin/Users/Index.tsx
import { Head, Link, router } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import SharedDataTable, { Column } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { money } from "@/components/admin/money";
import { RowActions } from "@/components/admin/row-actions";
import { Eye, PlusCircle } from "lucide-react";

type UserRow = {
    id: number;
    name: string;
    email: string;
    email_verified: boolean;
    phone: string | null;
    phone_verified: boolean;
    business_name: string | null;
    roles: string[];
    wallet_balance: number;
    counts: {
        parcels: number;
        recipients: number;
        payments: number;
        orders: number;
        supply_requests: number;
    };
    created_at: string | null;
};

type Filters = {
    role: string | null;
    q: string | null;
};

type Props = {
    users: UserRow[];
    filters: Filters;
    options: {
        roles: Record<string, string>;
    };
};

const ROLE_TONE: Record<string, string> = {
    admin: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    merchant:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    staff: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    customer:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

function RolePills({
    roles,
    labels,
}: {
    roles: string[];
    labels: Record<string, string>;
}) {
    if (!roles.length) {
        return <span className="text-xs text-muted-foreground">—</span>;
    }
    return (
        <div className="flex flex-wrap gap-1">
            {roles.map((r) => (
                <span
                    key={r}
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        ROLE_TONE[r] ?? "bg-muted text-muted-foreground"
                    }`}
                >
                    {labels[r] ?? r}
                </span>
            ))}
        </div>
    );
}

export default function Index({ users, filters, options }: Props) {
    const [q, setQ] = useState(filters.q ?? "");

    useEffect(() => {
        setQ(filters.q ?? "");
    }, [filters.q]);

    const apply = useCallback(
        (patch: Partial<Filters>) => {
            router.get(
                route("admin.users.index"),
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
        router.get(route("admin.users.index"), {}, { replace: true });
    }, []);

    const tableOptions = useMemo(
        () => ({
            order: [[0, "desc" as const]],
            pageLength: 25,
            columnDefs: [
                {
                    targets: [0, 7], // Created, Actions
                    orderable: false,
                    searchable: false,
                },
            ],
        }),
        [],
    );

    return (
        <>
            <Head title="Users" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold">
                        {options.roles[filters.role ?? "admin_staff"] ??
                            "Users"}
                    </h1>
                    <Button asChild size="sm">
                        <Link
                            href={route("admin.users.create", {
                                role: filters.role ?? "staff",
                            })}
                        >
                            <PlusCircle className="mr-1 h-4 w-4" />
                            Add user
                        </Link>
                    </Button>
                </div>
                <form
                    onSubmit={submitSearch}
                    className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3"
                >
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-muted-foreground">
                        Role
                        <select
                            value={filters.role ?? "staff"}
                            onChange={(e) =>
                                apply({ role: e.target.value || null })
                            }
                            className="w-40 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        >
                            {Object.entries(options.roles).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                    </label>

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
                            placeholder="Name / email / phone / business"
                            className="w-64 rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm"
                        />
                    </label>

                    <Button type="submit">Apply</Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={resetFilters}
                    >
                        Reset
                    </Button>
                </form>

                <SharedDataTable
                    data={users}
                    className="display w-full"
                    options={tableOptions}
                >
                    <Column title="Created" data="created_at">
                        {(v: string | null) => (
                            <span className="text-sm text-muted-foreground">
                                {v ? new Date(v).toLocaleString("en-KE") : "—"}
                            </span>
                        )}
                    </Column>

                    <Column title="Name" data="name">
                        {(_v, _t, row: UserRow) => (
                            <div>
                                <div className="text-sm font-semibold">
                                    {row.name}
                                </div>
                                {row.business_name && (
                                    <div className="text-xs text-muted-foreground">
                                        {row.business_name}
                                    </div>
                                )}
                            </div>
                        )}
                    </Column>

                    <Column title="Contact" data="email">
                        {(_v, _t, row: UserRow) => (
                            <div>
                                <div className="text-sm">{row.email}</div>
                                <div className="text-xs text-muted-foreground">
                                    {row.phone ?? "—"}
                                </div>
                            </div>
                        )}
                    </Column>

                    <Column title="Roles" data="roles">
                        {(_v, _t, row: UserRow) => (
                            <RolePills
                                roles={row.roles}
                                labels={options.roles}
                            />
                        )}
                    </Column>

                    <Column title="Wallet" data="wallet_balance">
                        {(v: number) => (
                            <span className="tabular-nums text-sm font-semibold">
                                {money(v)}
                            </span>
                        )}
                    </Column>

                    <Column title="Activity" data="counts">
                        {(_v, _t, row: UserRow) => (
                            <div className="text-xs text-muted-foreground">
                                {row.roles.includes("staff") && (
                                    <div>
                                        {row.counts.parcels} parcels ·{" "}
                                        {row.counts.recipients} recipients
                                    </div>
                                )}
                                {row.roles.includes("merchant") && (
                                    <div>
                                        {row.counts.orders} orders ·{" "}
                                        {row.counts.supply_requests} supply reqs
                                    </div>
                                )}
                                {(row.roles.includes("customer") ||
                                    row.roles.includes("admin")) && (
                                    <div>
                                        {row.counts.payments} payments ·{" "}
                                        {row.counts.parcels} parcels
                                    </div>
                                )}
                            </div>
                        )}
                    </Column>

                    <Column title="Verified" data="email_verified">
                        {(_v, _t, row: UserRow) => (
                            <div className="flex flex-col gap-0.5 text-xs">
                                <span
                                    className={
                                        row.email_verified
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-muted-foreground"
                                    }
                                >
                                    Email {row.email_verified ? "✓" : "—"}
                                </span>
                                <span
                                    className={
                                        row.phone_verified
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-muted-foreground"
                                    }
                                >
                                    Phone {row.phone_verified ? "✓" : "—"}
                                </span>
                            </div>
                        )}
                    </Column>

                    <Column
                        title="Actions"
                        data="id"
                        options={{ orderable: false, searchable: false }}
                    >
                        {(_id, _t, row: UserRow) => (
                            <RowActions>
                                <Button
                                    asChild
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                >
                                    <Link
                                        href={route("admin.users.show", row.id)}
                                        aria-label={`Open ${row.name}`}
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
    breadcrumbs: [{ title: "Users", href: "/admin/users" }],
};
