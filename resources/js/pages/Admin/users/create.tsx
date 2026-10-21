// resources/js/pages/Admin/Users/Create.tsx
import { Head, Link, useForm } from "@inertiajs/react";
import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/admin/flash-banner";
import {
    ArrowLeft,
    Building2,
    Mail,
    ShieldCheck,
    UserPlus,
    Wallet,
} from "lucide-react";

type Role = "staff" | "admin" | "merchant" | "customer";

type Props = {
    defaults: { role: Role };
    options: { roles: Record<Role, string> };
};

/* ============================================================
 | Sub-components (mirror Show.tsx)
 * ============================================================ */

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

const ROLE_TONE: Record<Role, string> = {
    admin: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    merchant:
        "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
    staff: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    customer:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
};

/* ============================================================
 | Page
 * ============================================================ */

export default function Create({ defaults, options }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
        email: "",
        phone: "",
        business_name: "",
        role: defaults.role as Role,
        verify_email: false,
    });

    const isMerchant = data.role === "merchant";

    const roleEntries = useMemo(
        () => Object.entries(options.roles) as [Role, string][],
        [options.roles],
    );

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route("admin.users.store"), {
            preserveScroll: true,
        });
    };

    const resetForm = () => {
        reset();
    };

    return (
        <>
            <Head title="Add user" />
            <div className="space-y-4 p-6">
                <FlashBanner />

                {/* ---------------- header ---------------- */}
                <div className="flex flex-wrap items-start justify-between gap-3">
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
                            <span className="opacity-50">/</span> New
                        </nav>
                        <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold">
                            <UserPlus className="h-6 w-6 text-muted-foreground" />
                            Add user
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Create a new account and assign a role. A wallet is
                            created automatically and login credentials are sent
                            by SMS.
                        </p>
                    </div>

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
                </div>

                {/* ---------------- form ---------------- */}
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                        {/* left column — identity + credentials */}
                        <div className="space-y-4">
                            <Panel title="Identity" icon={UserPlus}>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field label="Name" error={errors.name}>
                                        <input
                                            className={inputClass}
                                            value={data.name}
                                            onChange={(e) =>
                                                setData("name", e.target.value)
                                            }
                                            placeholder="Jane Doe"
                                            autoComplete="name"
                                            autoFocus
                                            required
                                        />
                                    </Field>

                                    <Field label="Role" error={errors.role}>
                                        <select
                                            className={inputClass}
                                            value={data.role}
                                            onChange={(e) =>
                                                setData(
                                                    "role",
                                                    e.target.value as Role,
                                                )
                                            }
                                            required
                                        >
                                            {roleEntries.map(([k, v]) => (
                                                <option key={k} value={k}>
                                                    {v}
                                                </option>
                                            ))}
                                        </select>
                                    </Field>

                                    <Field label="Email" error={errors.email}>
                                        <input
                                            type="email"
                                            className={inputClass}
                                            value={data.email}
                                            onChange={(e) =>
                                                setData("email", e.target.value)
                                            }
                                            placeholder="jane@example.com"
                                            autoComplete="email"
                                            required
                                        />
                                    </Field>

                                    <Field
                                        label="Phone"
                                        error={errors.phone}
                                        hint="Used for SMS login credentials and M-PESA."
                                    >
                                        <input
                                            className={inputClass}
                                            value={data.phone}
                                            onChange={(e) =>
                                                setData("phone", e.target.value)
                                            }
                                            placeholder="07XX XXX XXX"
                                            autoComplete="tel"
                                        />
                                    </Field>

                                    {isMerchant && (
                                        <Field
                                            label="Business name"
                                            error={errors.business_name}
                                            hint="Shown on merchant reports."
                                        >
                                            <input
                                                className={inputClass}
                                                value={data.business_name}
                                                onChange={(e) =>
                                                    setData(
                                                        "business_name",
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Acme Traders"
                                            />
                                        </Field>
                                    )}
                                </div>
                            </Panel>

                            <Panel title="Credentials" icon={ShieldCheck}>
                                <div className="space-y-2 text-sm">
                                    <p className="text-muted-foreground">
                                        A secure password will be generated
                                        automatically and sent to the user by
                                        SMS at{" "}
                                        <span className="font-mono text-foreground">
                                            {data.phone ||
                                                "the phone number entered above"}
                                        </span>
                                        . The user is prompted to change it on
                                        first login.
                                    </p>

                                    {!data.phone && (
                                        <p className="rounded-lg border border-amber-300/60 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/40 dark:text-amber-200">
                                            No phone number — the password will
                                            be shown to you once on the next
                                            screen so you can deliver it
                                            manually.
                                        </p>
                                    )}

                                    <label className="flex items-start gap-2 rounded-lg border border-sidebar-border/60 bg-neutral-50 p-3 text-sm dark:bg-neutral-800/40">
                                        <input
                                            type="checkbox"
                                            className="mt-0.5 h-4 w-4"
                                            checked={data.verify_email}
                                            onChange={(e) =>
                                                setData(
                                                    "verify_email",
                                                    e.target.checked,
                                                )
                                            }
                                        />
                                        <span>
                                            <span className="font-medium">
                                                Mark email as verified
                                            </span>
                                            <span className="block text-xs text-muted-foreground">
                                                Skip the verification email —
                                                useful for accounts created in
                                                person.
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            </Panel>
                        </div>

                        {/* right column — preview card */}
                        <div className="space-y-4 lg:w-80">
                            <Panel title="Preview" icon={Mail}>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between gap-3 border-b border-sidebar-border/40 py-1.5">
                                        <span className="text-muted-foreground">
                                            Name
                                        </span>
                                        <span className="font-medium">
                                            {data.name || (
                                                <span className="italic text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-3 border-b border-sidebar-border/40 py-1.5">
                                        <span className="text-muted-foreground">
                                            Email
                                        </span>
                                        <span className="truncate font-mono text-xs">
                                            {data.email || "—"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-3 border-b border-sidebar-border/40 py-1.5">
                                        <span className="text-muted-foreground">
                                            Phone
                                        </span>
                                        <span className="font-mono text-xs">
                                            {data.phone || "—"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-3 border-b border-sidebar-border/40 py-1.5">
                                        <span className="text-muted-foreground">
                                            Role
                                        </span>
                                        <span
                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[.68rem] font-semibold uppercase tracking-wide ${
                                                ROLE_TONE[data.role]
                                            }`}
                                        >
                                            {options.roles[data.role]}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-3 border-b border-sidebar-border/40 py-1.5">
                                        <span className="text-muted-foreground">
                                            Email verified
                                        </span>
                                        <span>
                                            {data.verify_email
                                                ? "Yes"
                                                : "No (email sent)"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between gap-3 border-b border-sidebar-border/40 py-1.5">
                                        <span className="text-muted-foreground">
                                            Password
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            auto-generated · sent by SMS
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 py-1.5">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Wallet className="h-3.5 w-3.5" />
                                            Wallet
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            auto-created · KES 0
                                        </span>
                                    </div>
                                </div>
                            </Panel>

                            {isMerchant && (
                                <Panel title="Merchant" icon={Building2}>
                                    <div className="flex justify-between gap-3 py-1.5 text-sm">
                                        <span className="text-muted-foreground">
                                            Business
                                        </span>
                                        <span className="text-right font-medium">
                                            {data.business_name || "—"}
                                        </span>
                                    </div>
                                </Panel>
                            )}

                            <div className="flex flex-col gap-2">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full"
                                >
                                    {processing
                                        ? "Creating…"
                                        : "Create & send SMS"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                    disabled={processing}
                                    className="w-full"
                                >
                                    Reset form
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    asChild
                                    disabled={processing}
                                    className="w-full"
                                >
                                    <Link
                                        href={route("admin.users.index", {
                                            role: "admin_staff",
                                        })}
                                    >
                                        Cancel
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = {
    breadcrumbs: [
        { title: "Users", href: "/admin/users" },
        { title: "Add user", href: "#" },
    ],
};
