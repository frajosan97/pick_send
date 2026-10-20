// resources/js/pages/Admin/Routes/Index.tsx
import { Head, router, useForm } from "@inertiajs/react";
import { useCallback, useMemo, useState } from "react";
import SharedDataTable, { Column } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, TextField } from "@/components/admin/form-field";
import { money } from "@/components/admin/money";
import { confirmDelete, toastError, toastSuccess } from "@/lib/toast";
import { RowActions } from "@/components/admin/row-actions";
import { MapPin, PenIcon, PlusCircle, Trash2 } from "lucide-react";

/* ============================================================
 | Types
 * ============================================================ */

type Town = {
    id: number;
    name: string;
    is_satellite: boolean;
    satellite_fee: number;
    sort_order: number;
    is_active: boolean;
};

type RouteModel = {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    towns_count: number;
    towns?: Town[];
};

type RouteForm = {
    id?: number;
    name: string;
    slug: string;
    is_active: boolean;
};

type TownForm = {
    id?: number;
    route_id: number;
    name: string;
    is_satellite: boolean;
    satellite_fee: number;
    sort_order: number;
    is_active: boolean;
};

const emptyRoute: RouteForm = { name: "", slug: "", is_active: true };
const emptyTown = (routeId: number): TownForm => ({
    route_id: routeId,
    name: "",
    is_satellite: false,
    satellite_fee: 0,
    sort_order: 0,
    is_active: true,
});

const slugify = (v: string) =>
    v
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

/* ============================================================
 | Page
 * ============================================================ */

export default function Index({ routes }: { routes: RouteModel[] }) {
    /* ---------------- Route modal state ---------------- */
    const [isRouteOpen, setIsRouteOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<RouteForm | null>(null);
    const routeForm = useForm<RouteForm>(emptyRoute);

    /* ---------------- Towns modal state ---------------- */
    const [isTownsOpen, setIsTownsOpen] = useState(false);
    const [activeRouteId, setActiveRouteId] = useState<number | null>(null);

    /* ---------------- Town sub-modal state ---------------- */
    const [isTownOpen, setIsTownOpen] = useState(false);
    const [editingTownId, setEditingTownId] = useState<number | null>(null);
    const townForm = useForm<TownForm>(emptyTown(0));

    /**
     * The live route is derived from props so the towns table and
     * town sub-modal always reflect the latest server state after
     * an Inertia reload.
     */
    const activeRoute = activeRouteId
        ? (routes.find((r) => r.id === activeRouteId) ?? null)
        : null;

    /* ============================================================
     | Route handlers
     * ============================================================ */

    const openCreateRoute = useCallback(() => {
        routeForm.reset();
        routeForm.clearErrors();
        setEditingRoute(null);
        setIsRouteOpen(true);
    }, [routeForm]);

    const openEditRoute = useCallback(
        (r: RouteModel) => {
            routeForm.clearErrors();
            setEditingRoute(r);
            routeForm.setData({
                name: r.name,
                slug: r.slug,
                is_active: r.is_active,
            });
            setIsRouteOpen(true);
        },
        [routeForm],
    );

    const closeRouteModal = useCallback(() => {
        setIsRouteOpen(false);
        routeForm.reset();
        routeForm.clearErrors();
        setEditingRoute(null);
    }, [routeForm]);

    const submitRoute = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const opts = {
                onSuccess: () => {
                    closeRouteModal();
                    toastSuccess(
                        editingRoute ? "Route updated" : "Route created",
                    );
                },
                onError: () => toastError("Please fix the errors below"),
                preserveScroll: true,
            };
            if (editingRoute?.id) {
                routeForm.put(
                    route("admin.routes.update", editingRoute.id),
                    opts,
                );
            } else {
                routeForm.post(route("admin.routes.store"), opts);
            }
        },
        [editingRoute, routeForm, closeRouteModal],
    );

    const destroyRoute = useCallback(async (id: number) => {
        const ok = await confirmDelete(
            "Deleting this route will also delete its towns.",
        );
        if (!ok) return;
        router.delete(route("admin.routes.destroy", id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess("Route deleted"),
            onError: () => toastError("Failed to delete route"),
        });
    }, []);

    /* ============================================================
     | Towns modal handlers
     * ============================================================ */

    const openTowns = useCallback((r: RouteModel) => {
        setActiveRouteId(r.id);
        setIsTownsOpen(true);
    }, []);

    const closeTownsModal = useCallback(() => {
        setIsTownsOpen(false);
        setActiveRouteId(null);
    }, []);

    /* ============================================================
     | Town sub-modal handlers
     * ============================================================ */

    const openCreateTown = useCallback(() => {
        if (!activeRoute) return;
        townForm.reset();
        townForm.clearErrors();
        townForm.setData(emptyTown(activeRoute.id));
        setEditingTownId(null);
        setIsTownOpen(true);
    }, [activeRoute, townForm]);

    const openEditTown = useCallback(
        (t: Town) => {
            if (!activeRoute) return;
            townForm.clearErrors();
            townForm.setData({
                id: t.id,
                route_id: activeRoute.id,
                name: t.name,
                is_satellite: t.is_satellite,
                satellite_fee: t.satellite_fee,
                sort_order: t.sort_order,
                is_active: t.is_active,
            });
            setEditingTownId(t.id);
            setIsTownOpen(true);
        },
        [activeRoute, townForm],
    );

    const closeTownModal = useCallback(() => {
        setIsTownOpen(false);
        townForm.reset();
        townForm.clearErrors();
        setEditingTownId(null);
    }, [townForm]);

    const submitTown = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!activeRoute) return;
            const opts = {
                onSuccess: () => {
                    closeTownModal();
                    toastSuccess(editingTownId ? "Town updated" : "Town added");
                },
                onError: () => toastError("Please fix the errors below"),
                preserveScroll: true,
            };

            if (editingTownId) {
                townForm.put(
                    route("admin.routes.towns.update", [
                        activeRoute.id,
                        editingTownId,
                    ]),
                    opts,
                );
            } else {
                townForm.post(
                    route("admin.routes.towns.store", activeRoute.id),
                    opts,
                );
            }
        },
        [activeRoute, editingTownId, townForm, closeTownModal],
    );

    const destroyTown = useCallback(
        async (t: Town) => {
            if (!activeRoute) return;
            const ok = await confirmDelete(
                "This town will be removed from the route.",
            );
            if (!ok) return;
            router.delete(
                route("admin.routes.towns.destroy", [activeRoute.id, t.id]),
                {
                    preserveScroll: true,
                    onSuccess: () => toastSuccess("Town removed"),
                    onError: () => toastError("Failed to remove town"),
                },
            );
        },
        [activeRoute],
    );

    /* ============================================================
     | Table options
     * ============================================================ */

    const routeTableOptions = useMemo(
        () => ({
            order: [[0, "asc" as const]],
            pageLength: 25,
            columnDefs: [
                { targets: 2, type: "num" as const }, // Towns count
                {
                    targets: 4, // Actions
                    orderable: false,
                    searchable: false,
                },
            ],
        }),
        [],
    );

    const townTableOptions = useMemo(
        () => ({
            order: [[0, "asc" as const]],
            pageLength: 10,
            columnDefs: [
                { targets: 2, type: "num" as const }, // Fee
                {
                    targets: 4, // Actions
                    orderable: false,
                    searchable: false,
                },
            ],
        }),
        [],
    );

    /* ============================================================
     | Render
     * ============================================================ */

    return (
        <>
            <Head title="Routes" />
            <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Routes</h1>
                        <p className="text-sm text-muted-foreground">
                            {routes.length} route
                            {routes.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    <Button onClick={openCreateRoute} aria-label="Create route">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Route
                    </Button>
                </div>

                <SharedDataTable
                    data={routes}
                    className="display w-full"
                    options={routeTableOptions}
                >
                    <Column title="Name" data="name">
                        {(name: string) => (
                            <span className="text-sm font-medium">{name}</span>
                        )}
                    </Column>

                    <Column title="Slug" data="slug">
                        {(slug: string) => (
                            <button
                                type="button"
                                onClick={() => {
                                    navigator.clipboard?.writeText(slug);
                                    toastSuccess(`Copied "${slug}"`);
                                }}
                                title="Click to copy"
                                className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                            >
                                {slug}
                            </button>
                        )}
                    </Column>

                    <Column title="Towns" data="towns_count">
                        {(count: number, _t, row: RouteModel) => (
                            <button
                                type="button"
                                onClick={() => openTowns(row)}
                                className="inline-flex items-center gap-1 rounded px-1 tabular-nums text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                title="Manage towns"
                            >
                                <MapPin className="h-3 w-3 text-muted-foreground" />
                                {count}
                            </button>
                        )}
                    </Column>

                    <Column title="Active" data="is_active">
                        {(isActive: boolean) => (
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold ${
                                    isActive
                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                                        : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                                }`}
                            >
                                {isActive ? "Active" : "Inactive"}
                            </span>
                        )}
                    </Column>

                    <Column
                        title="Actions"
                        data="id"
                        options={{ orderable: false, searchable: false }}
                    >
                        {(id: number, _type: string, row: RouteModel) => (
                            <RowActions>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openTowns(row);
                                    }}
                                    aria-label={`Manage towns for ${row.name}`}
                                    title="Manage towns"
                                >
                                    <MapPin className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEditRoute(row);
                                    }}
                                    aria-label={`Edit ${row.name}`}
                                    title="Edit route"
                                >
                                    <PenIcon className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        destroyRoute(id);
                                    }}
                                    aria-label={`Delete ${row.name}`}
                                    title="Delete route"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </RowActions>
                        )}
                    </Column>
                </SharedDataTable>
            </div>

            {/* ============================================================
                Route modal
            ============================================================ */}
            <Dialog
                open={isRouteOpen}
                onOpenChange={(v) =>
                    v ? setIsRouteOpen(true) : closeRouteModal()
                }
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingRoute ? "Edit Route" : "New Route"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingRoute
                                ? "Update the route details."
                                : "Create a new route."}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={submitRoute}
                        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
                    >
                        <DialogBody className="space-y-4">
                            <Field label="Name" error={routeForm.errors.name}>
                                <TextField
                                    value={routeForm.data.name}
                                    onChange={(v) => {
                                        routeForm.setData("name", v);
                                        routeForm.setData("slug", slugify(v));
                                    }}
                                    placeholder="e.g. Nairobi Metro"
                                />
                            </Field>
                            <Field label="Slug" error={routeForm.errors.slug}>
                                <TextField
                                    value={routeForm.data.slug}
                                    onChange={(v) =>
                                        routeForm.setData("slug", v)
                                    }
                                    placeholder="nairobi-metro"
                                />
                            </Field>
                            <label className="flex items-center gap-2">
                                <Checkbox
                                    checked={routeForm.data.is_active}
                                    onCheckedChange={(v) =>
                                        routeForm.setData("is_active", !!v)
                                    }
                                />
                                <span>Active</span>
                            </label>
                        </DialogBody>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeRouteModal}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={routeForm.processing}
                            >
                                {routeForm.processing ? "Saving…" : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                Towns modal (sibling of Route modal, NOT nested in it)
            ============================================================ */}
            <Dialog
                open={isTownsOpen}
                onOpenChange={(v) =>
                    v ? setIsTownsOpen(true) : closeTownsModal()
                }
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Towns — {activeRoute?.name ?? "—"}
                        </DialogTitle>
                        <DialogDescription>
                            Manage the towns on this route.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogBody className="space-y-3">
                        <div className="flex justify-end">
                            <Button size="sm" onClick={openCreateTown}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Town
                            </Button>
                        </div>

                        {activeRoute && activeRoute.towns_count === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No towns yet. Add the first town on this route.
                            </p>
                        )}

                        <SharedDataTable
                            data={activeRoute?.towns ?? []}
                            className="display w-full"
                            options={townTableOptions}
                        >
                            <Column title="Name" data="name">
                                {(name: string) => (
                                    <span className="text-sm font-medium">
                                        {name}
                                    </span>
                                )}
                            </Column>

                            <Column title="Satellite" data="is_satellite">
                                {(isSatellite: boolean) => (
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold ${
                                            isSatellite
                                                ? "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200"
                                                : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                                        }`}
                                    >
                                        {isSatellite ? "Yes" : "No"}
                                    </span>
                                )}
                            </Column>

                            <Column title="Fee" data="satellite_fee">
                                {(fee: number) => (
                                    <span className="tabular-nums text-sm">
                                        {money(fee)}
                                    </span>
                                )}
                            </Column>

                            <Column title="Active" data="is_active">
                                {(isActive: boolean) => (
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold ${
                                            isActive
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                                                : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                                        }`}
                                    >
                                        {isActive ? "Active" : "Inactive"}
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
                                {(_id: number, _type: string, row: Town) => (
                                    <RowActions>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditTown(row);
                                            }}
                                            aria-label={`Edit ${row.name}`}
                                            title="Edit town"
                                        >
                                            <PenIcon className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                destroyTown(row);
                                            }}
                                            aria-label={`Delete ${row.name}`}
                                            title="Delete town"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </RowActions>
                                )}
                            </Column>
                        </SharedDataTable>
                    </DialogBody>
                </DialogContent>
            </Dialog>

            {/* ============================================================
                Town sub-modal (sibling of towns modal)
            ============================================================ */}
            <Dialog
                open={isTownOpen}
                onOpenChange={(v) =>
                    v ? setIsTownOpen(true) : closeTownModal()
                }
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTownId ? "Edit Town" : "Add Town"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTownId
                                ? "Update the town details."
                                : "Add a new town to this route."}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={submitTown}
                        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
                    >
                        <DialogBody className="space-y-4">
                            <Field label="Name" error={townForm.errors.name}>
                                <TextField
                                    value={townForm.data.name}
                                    onChange={(v) =>
                                        townForm.setData("name", v)
                                    }
                                    placeholder="e.g. Westlands"
                                />
                            </Field>
                            <Field
                                label="Sort Order"
                                error={townForm.errors.sort_order}
                                hint="Lower numbers appear first."
                            >
                                <TextField
                                    type="number"
                                    value={townForm.data.sort_order}
                                    onChange={(v) =>
                                        townForm.setData("sort_order", v)
                                    }
                                />
                            </Field>
                            <Field
                                label="Satellite Fee (KSh)"
                                error={townForm.errors.satellite_fee}
                            >
                                <TextField
                                    type="number"
                                    value={townForm.data.satellite_fee}
                                    onChange={(v) =>
                                        townForm.setData("satellite_fee", v)
                                    }
                                />
                            </Field>
                            <label className="flex items-center gap-2">
                                <Checkbox
                                    checked={townForm.data.is_satellite}
                                    onCheckedChange={(v) =>
                                        townForm.setData("is_satellite", !!v)
                                    }
                                />
                                <span>Satellite town</span>
                            </label>
                            <label className="flex items-center gap-2">
                                <Checkbox
                                    checked={townForm.data.is_active}
                                    onCheckedChange={(v) =>
                                        townForm.setData("is_active", !!v)
                                    }
                                />
                                <span>Active</span>
                            </label>
                        </DialogBody>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeTownModal}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={townForm.processing}
                            >
                                {townForm.processing ? "Saving…" : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: "Routes", href: "/admin/routes" }],
};
