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
import { confirmDelete, toastError, toastSuccess } from "@/lib/toast";
import { RowActions } from "@/components/admin/row-actions";
import { MapPin, PenIcon, PlusCircle, Trash2 } from "lucide-react";

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

export default function Index({ routes }: { routes: RouteModel[] }) {
    // ---- Route modal ----
    const [isRouteOpen, setIsRouteOpen] = useState(false);
    const [editingRoute, setEditingRoute] = useState<RouteForm | null>(null);
    const routeForm = useForm<RouteForm>(emptyRoute);

    // ---- Towns modal (belongs to a route) ----
    const [isTownsOpen, setIsTownsOpen] = useState(false);
    const [activeRouteId, setActiveRouteId] = useState<number | null>(null);

    // ---- Town modal (inside towns list) ----
    const [isTownOpen, setIsTownOpen] = useState(false);
    const [editingTown, setEditingTown] = useState<TownForm | null>(null);
    const townForm = useForm<TownForm>(emptyTown(0));

    // Derive the live route from current props so towns update after a save
    const activeRoute = activeRouteId
        ? (routes.find((r) => r.id === activeRouteId) ?? null)
        : null;

    // ---- Route handlers ----
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

    // ---- Towns handlers ----
    const openTowns = useCallback((r: RouteModel) => {
        setActiveRouteId(r.id);
        setIsTownsOpen(true);
    }, []);

    const closeTownsModal = useCallback(() => {
        setIsTownsOpen(false);
        setActiveRouteId(null);
    }, []);

    const openCreateTown = useCallback(() => {
        if (!activeRoute) return;
        townForm.reset();
        townForm.clearErrors();
        townForm.setData(emptyTown(activeRoute.id));
        setEditingTown(null);
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
            setEditingTown({ ...townForm.data, id: t.id });
            setIsTownOpen(true);
        },
        [activeRoute, townForm],
    );

    const closeTownModal = useCallback(() => {
        setIsTownOpen(false);
        townForm.reset();
        townForm.clearErrors();
    }, [townForm]);

    const submitTown = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!activeRoute) return;
            const opts = {
                onSuccess: () => {
                    closeTownModal();
                    toastSuccess(editingTown ? "Town updated" : "Town added");
                },
                onError: () => toastError("Please fix the errors below"),
                preserveScroll: true,
            };

            if (editingTown?.id) {
                townForm.put(
                    route("admin.routes.towns.update", [
                        activeRoute.id,
                        editingTown.id,
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
        [activeRoute, editingTown, townForm, closeTownModal],
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

    // Routes table: sort by Name (index 0)
    const routeTableOptions = useMemo(
        () => ({
            order: [[0, "asc" as const]],
        }),
        [],
    );

    // Towns table: sort by Name (index 0)
    const townTableOptions = useMemo(
        () => ({
            order: [[0, "asc" as const]],
        }),
        [],
    );

    return (
        <>
            <Head title="Routes" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Routes</h1>
                    <Button onClick={openCreateRoute}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Route
                    </Button>
                </div>

                <div className="ps-datatable overflow-hidden rounded-lg border bg-card p-4">
                    <SharedDataTable
                        data={routes}
                        className="display w-full"
                        options={routeTableOptions}
                    >
                        <Column title="Name" data="name">
                            {(name: string) => (
                                <span className="text-sm">{name}</span>
                            )}
                        </Column>

                        <Column title="Slug" data="slug">
                            {(slug: string) => (
                                <span className="font-mono text-xs">
                                    {slug}
                                </span>
                            )}
                        </Column>

                        <Column title="Towns" data="towns_count">
                            {(count: number) => (
                                <span className="tabular-nums text-sm">
                                    {count}
                                </span>
                            )}
                        </Column>

                        <Column title="Active" data="is_active">
                            {(is_active: boolean) => (
                                <span
                                    className={
                                        is_active
                                            ? "text-sm text-green-600"
                                            : "text-sm text-muted-foreground"
                                    }
                                >
                                    {is_active ? "Yes" : "No"}
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
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </RowActions>
                            )}
                        </Column>
                    </SharedDataTable>
                </div>
            </div>

            {/* Route modal */}
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
                                />
                            </Field>
                            <Field label="Slug" error={routeForm.errors.slug}>
                                <TextField
                                    value={routeForm.data.slug}
                                    onChange={(v) =>
                                        routeForm.setData("slug", v)
                                    }
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
                                {routeForm.processing ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Towns modal */}
            <Dialog
                open={isTownsOpen}
                onOpenChange={(v) =>
                    v ? setIsTownsOpen(true) : closeTownsModal()
                }
            >
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Towns — {activeRoute?.name}</DialogTitle>
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
                        <div className="ps-datatable rounded-lg border bg-card p-2">
                            <SharedDataTable
                                data={activeRoute?.towns ?? []}
                                className="display w-full"
                                options={townTableOptions}
                            >
                                <Column title="Name" data="name">
                                    {(name: string) => (
                                        <span className="text-sm">{name}</span>
                                    )}
                                </Column>

                                <Column title="Satellite" data="is_satellite">
                                    {(is_satellite: boolean) => (
                                        <span className="text-sm text-muted-foreground">
                                            {is_satellite ? "Yes" : "No"}
                                        </span>
                                    )}
                                </Column>

                                <Column title="Fee" data="satellite_fee">
                                    {(fee: number) => (
                                        <span className="tabular-nums text-sm">
                                            {fee.toLocaleString()}
                                        </span>
                                    )}
                                </Column>

                                <Column title="Active" data="is_active">
                                    {(is_active: boolean) => (
                                        <span
                                            className={
                                                is_active
                                                    ? "text-sm text-green-600"
                                                    : "text-sm text-muted-foreground"
                                            }
                                        >
                                            {is_active ? "Yes" : "No"}
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
                                    {(
                                        _id: number,
                                        _type: string,
                                        row: Town,
                                    ) => (
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
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </RowActions>
                                    )}
                                </Column>
                            </SharedDataTable>
                        </div>
                    </DialogBody>
                </DialogContent>
            </Dialog>

            {/* Town sub-modal */}
            <Dialog
                open={isTownOpen}
                onOpenChange={(v) =>
                    v ? setIsTownOpen(true) : closeTownModal()
                }
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTown?.id ? "Edit Town" : "Add Town"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTown?.id
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
                                />
                            </Field>
                            <Field
                                label="Sort Order"
                                error={townForm.errors.sort_order}
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
                                {townForm.processing ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
