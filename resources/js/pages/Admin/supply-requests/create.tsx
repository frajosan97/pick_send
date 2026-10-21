// resources/js/pages/Admin/SupplyRequests/Create.tsx
import { Head, Link, useForm } from "@inertiajs/react";
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/admin/flash-banner";
import { ArrowLeft, Plus } from "lucide-react";

type Props = {
    defaults: { user_id: number | null };
    options: {
        statuses: Record<string, string>;
        frequencies: Record<string, string>;
        towns: { id: number; name: string }[];
    };
};

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
            <div className="px-4 py-3">{children}</div>
        </section>
    );
}

function Field({
    label,
    error,
    hint,
    children,
}: {
    label: string;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
            </span>
            {children}
            {hint && !error && (
                <span className="block text-xs text-muted-foreground">
                    {hint}
                </span>
            )}
            {error && (
                <span className="block text-xs text-rose-600 dark:text-rose-400">
                    {error}
                </span>
            )}
        </label>
    );
}

const inputClass =
    "w-full rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ps-brand/40";

export default function Create({ defaults, options }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: defaults.user_id,
        name: "",
        phone: "",
        town_id: "" as number | "",
        what: "",
        pickup_from: "",
        supplier_phone: "",
        frequency: "once",
        status: "pending",
    });

    const townEntries = useMemo(() => options.towns, [options.towns]);

    const isRecurring = data.frequency !== "once";

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route("admin.supply-requests.store"), {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="New supply request" />
            <div className="space-y-4 p-6">
                <FlashBanner />

                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <nav className="text-xs font-semibold uppercase text-muted-foreground">
                            <Link
                                href={route("admin.supply-requests.index")}
                                className="hover:underline"
                            >
                                Supply requests
                            </Link>{" "}
                            <span className="opacity-50">/</span> New
                        </nav>
                        <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold">
                            <Plus className="h-6 w-6 text-muted-foreground" />
                            New supply request
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Log a request on behalf of a customer or merchant.
                        </p>
                    </div>

                    <Button variant="outline" size="sm" asChild>
                        <Link href={route("admin.supply-requests.index")}>
                            <ArrowLeft className="mr-1 h-4 w-4" />
                            Back
                        </Link>
                    </Button>
                </div>

                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <Panel title="Requester">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Name" error={errors.name}>
                                    <input
                                        className={inputClass}
                                        value={data.name}
                                        onChange={(e) =>
                                            setData("name", e.target.value)
                                        }
                                        autoFocus
                                        required
                                    />
                                </Field>
                                <Field label="Phone" error={errors.phone}>
                                    <input
                                        className={inputClass}
                                        value={data.phone}
                                        onChange={(e) =>
                                            setData("phone", e.target.value)
                                        }
                                        placeholder="07XX XXX XXX"
                                        required
                                    />
                                </Field>
                                <Field
                                    label="Linked user ID"
                                    error={errors.user_id}
                                    hint="Optional — matches the request to an account."
                                >
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={data.user_id ?? ""}
                                        onChange={(e) =>
                                            setData(
                                                "user_id",
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : null,
                                            )
                                        }
                                        placeholder="e.g. 12"
                                    />
                                </Field>
                                <Field label="Town" error={errors.town_id}>
                                    <select
                                        className={inputClass}
                                        value={data.town_id}
                                        onChange={(e) =>
                                            setData(
                                                "town_id",
                                                e.target.value
                                                    ? Number(e.target.value)
                                                    : "",
                                            )
                                        }
                                        required
                                    >
                                        <option value="">Select a town…</option>
                                        {townEntries.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                        </Panel>

                        <Panel title="Request">
                            <div className="grid gap-3">
                                <Field label="What" error={errors.what}>
                                    <textarea
                                        rows={3}
                                        className={inputClass}
                                        value={data.what}
                                        onChange={(e) =>
                                            setData("what", e.target.value)
                                        }
                                        placeholder="Describe the item(s)…"
                                        required
                                    />
                                </Field>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field
                                        label="Pickup from"
                                        error={errors.pickup_from}
                                    >
                                        <input
                                            className={inputClass}
                                            value={data.pickup_from}
                                            onChange={(e) =>
                                                setData(
                                                    "pickup_from",
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Location / landmark"
                                            required
                                        />
                                    </Field>
                                    <Field
                                        label="Supplier phone"
                                        error={errors.supplier_phone}
                                    >
                                        <input
                                            className={inputClass}
                                            value={data.supplier_phone}
                                            onChange={(e) =>
                                                setData(
                                                    "supplier_phone",
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Optional"
                                        />
                                    </Field>
                                    <Field
                                        label="Frequency"
                                        error={errors.frequency}
                                        hint={
                                            isRecurring
                                                ? "Creates a recurring master — occurrences are generated automatically."
                                                : undefined
                                        }
                                    >
                                        <select
                                            className={inputClass}
                                            value={data.frequency}
                                            onChange={(e) =>
                                                setData(
                                                    "frequency",
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            {Object.entries(
                                                options.frequencies,
                                            ).map(([k, v]) => (
                                                <option key={k} value={k}>
                                                    {v}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Status" error={errors.status}>
                                        <select
                                            className={inputClass}
                                            value={data.status}
                                            onChange={(e) =>
                                                setData(
                                                    "status",
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            {Object.entries(
                                                options.statuses,
                                            ).map(([k, v]) => (
                                                <option key={k} value={k}>
                                                    {v}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </div>
                        </Panel>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="submit" disabled={processing}>
                            {processing ? "Creating…" : "Create request"}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => reset()}
                            disabled={processing}
                        >
                            Reset
                        </Button>
                        <Button type="button" variant="ghost" asChild>
                            <Link href={route("admin.supply-requests.index")}>
                                Cancel
                            </Link>
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        { title: "Supply requests", href: "/admin/supply-requests" },
        { title: "New", href: "#" },
    ],
};
