import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, TextField } from '@/components/admin/form-field';
import { confirmDelete, toastError, toastSuccess } from '@/lib/toast';
import { RowActions } from '@/components/admin/row-actions';
import { MapPin, PenIcon, PlusCircle, Trash2 } from 'lucide-react';

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

const emptyRoute: RouteForm = { name: '', slug: '', is_active: true };
const emptyTown = (routeId: number): TownForm => ({
    route_id: routeId,
    name: '',
    is_satellite: false,
    satellite_fee: 0,
    sort_order: 0,
    is_active: true,
});

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
    const openCreateRoute = () => {
        routeForm.reset();
        routeForm.clearErrors();
        setEditingRoute(null);
        setIsRouteOpen(true);
    };

    const openEditRoute = (r: RouteModel) => {
        routeForm.clearErrors();
        setEditingRoute(r);
        routeForm.setData({
            name: r.name,
            slug: r.slug,
            is_active: r.is_active,
        });
        setIsRouteOpen(true);
    };

    const closeRouteModal = () => {
        setIsRouteOpen(false);
        routeForm.reset();
        routeForm.clearErrors();
    };

    const submitRoute = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = {
            onSuccess: () => {
                closeRouteModal();
                toastSuccess(editingRoute ? 'Route updated' : 'Route created');
            },
            onError: () => toastError('Please fix the errors below'),
            preserveScroll: true,
        };
        if (editingRoute?.id) {
            routeForm.put(route('admin.routes.update', editingRoute.id), opts);
        } else {
            routeForm.post(route('admin.routes.store'), opts);
        }
    };

    const destroyRoute = async (id: number) => {
        const ok = await confirmDelete(
            'Deleting this route will also delete its towns.',
        );
        if (!ok) return;
        router.delete(route('admin.routes.destroy', id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('Route deleted'),
            onError: () => toastError('Failed to delete route'),
        });
    };

    // ---- Towns handlers ----
    const openTowns = (r: RouteModel) => {
        setActiveRouteId(r.id);
        setIsTownsOpen(true);
    };

    const closeTownsModal = () => {
        setIsTownsOpen(false);
        setActiveRouteId(null);
    };

    const openCreateTown = () => {
        if (!activeRoute) return;
        townForm.reset();
        townForm.clearErrors();
        townForm.setData(emptyTown(activeRoute.id));
        setEditingTown(null);
        setIsTownOpen(true);
    };

    const openEditTown = (t: Town) => {
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
    };

    const closeTownModal = () => {
        setIsTownOpen(false);
        townForm.reset();
        townForm.clearErrors();
    };

    const submitTown = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRoute) return;
        const opts = {
            onSuccess: () => {
                closeTownModal();
                toastSuccess(editingTown ? 'Town updated' : 'Town added');
            },
            onError: () => toastError('Please fix the errors below'),
            preserveScroll: true,
        };

        if (editingTown?.id) {
            townForm.put(
                route('admin.routes.towns.update', [
                    activeRoute.id,
                    editingTown.id,
                ]),
                opts,
            );
        } else {
            townForm.post(
                route('admin.routes.towns.store', activeRoute.id),
                opts,
            );
        }
    };

    const destroyTown = async (t: Town) => {
        if (!activeRoute) return;
        const ok = await confirmDelete(
            'This town will be removed from the route.',
        );
        if (!ok) return;
        router.delete(
            route('admin.routes.towns.destroy', [activeRoute.id, t.id]),
            {
                preserveScroll: true,
                onSuccess: () => toastSuccess('Town removed'),
                onError: () => toastError('Failed to remove town'),
            },
        );
    };

    return (
        <>
            <Head title="Routes" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Routes</h1>
                    <Button onClick={openCreateRoute}>
                        <PlusCircle /> New Route
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3 text-left">Slug</th>
                                <th className="p-3 text-left">Towns</th>
                                <th className="p-3 text-left">Active</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {routes.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        No routes yet.
                                    </td>
                                </tr>
                            )}
                            {routes.map((r) => (
                                <tr key={r.id} className="border-t">
                                    <td className="p-3">{r.name}</td>
                                    <td className="p-3 font-mono text-xs">
                                        {r.slug}
                                    </td>
                                    <td className="p-3">{r.towns_count}</td>
                                    <td className="p-3">
                                        {r.is_active ? 'Yes' : 'No'}
                                    </td>
                                    <td className="space-x-2 p-3 text-right">
                                        <RowActions>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openTowns(r)}
                                                title="Manage towns"
                                            >
                                                <MapPin />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openEditRoute(r)}
                                            >
                                                <PenIcon />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() =>
                                                    destroyRoute(r.id)
                                                }
                                            >
                                                <Trash2 />
                                            </Button>
                                        </RowActions>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                            {editingRoute ? 'Edit Route' : 'New Route'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingRoute
                                ? 'Update the route details.'
                                : 'Create a new route.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitRoute} className="space-y-4">
                        <Field label="Name" error={routeForm.errors.name}>
                            <TextField
                                value={routeForm.data.name}
                                onChange={(v) => {
                                    routeForm.setData('name', v);
                                    routeForm.setData(
                                        'slug',
                                        v
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]+/g, '-')
                                            .replace(/^-|-$/g, ''),
                                    );
                                }}
                            />
                        </Field>
                        <Field label="Slug" error={routeForm.errors.slug}>
                            <TextField
                                value={routeForm.data.slug}
                                onChange={(v) => routeForm.setData('slug', v)}
                            />
                        </Field>
                        <label className="flex items-center gap-2">
                            <Checkbox
                                checked={routeForm.data.is_active}
                                onCheckedChange={(v) =>
                                    routeForm.setData('is_active', !!v)
                                }
                            />
                            <span>Active</span>
                        </label>

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
                                {routeForm.processing ? 'Saving...' : 'Save'}
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

                    <div className="space-y-3">
                        <div className="flex justify-end">
                            <Button size="sm" onClick={openCreateTown}>
                                <PlusCircle /> Add Town
                            </Button>
                        </div>
                        <div className="max-h-96 overflow-hidden overflow-y-auto rounded-lg border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-3 text-left">Name</th>
                                        <th className="p-3 text-left">
                                            Satellite
                                        </th>
                                        <th className="p-3 text-left">Fee</th>
                                        <th className="p-3 text-left">
                                            Active
                                        </th>
                                        <th className="p-3 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(activeRoute?.towns ?? []).length ===
                                        0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="p-6 text-center text-muted-foreground"
                                            >
                                                No towns on this route yet.
                                            </td>
                                        </tr>
                                    )}
                                    {(activeRoute?.towns ?? []).map((t) => (
                                        <tr key={t.id} className="border-t">
                                            <td className="p-3">{t.name}</td>
                                            <td className="p-3">
                                                {t.is_satellite ? 'Yes' : 'No'}
                                            </td>
                                            <td className="p-3">
                                                {t.satellite_fee}
                                            </td>
                                            <td className="p-3">
                                                {t.is_active ? 'Yes' : 'No'}
                                            </td>
                                            <td className="space-x-2 p-3 text-right">
                                                <RowActions>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() =>
                                                            openEditTown(t)
                                                        }
                                                    >
                                                        <PenIcon />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() =>
                                                            destroyTown(t)
                                                        }
                                                    >
                                                        <Trash2 />
                                                    </Button>
                                                </RowActions>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
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
                            {editingTown?.id ? 'Edit Town' : 'Add Town'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingTown?.id
                                ? 'Update the town details.'
                                : 'Add a new town to this route.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitTown} className="space-y-4">
                        <Field label="Name" error={townForm.errors.name}>
                            <TextField
                                value={townForm.data.name}
                                onChange={(v) => townForm.setData('name', v)}
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
                                    townForm.setData('sort_order', v)
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
                                    townForm.setData('satellite_fee', v)
                                }
                            />
                        </Field>
                        <label className="flex items-center gap-2">
                            <Checkbox
                                checked={townForm.data.is_satellite}
                                onCheckedChange={(v) =>
                                    townForm.setData('is_satellite', !!v)
                                }
                            />
                            <span>Satellite town</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <Checkbox
                                checked={townForm.data.is_active}
                                onCheckedChange={(v) =>
                                    townForm.setData('is_active', !!v)
                                }
                            />
                            <span>Active</span>
                        </label>

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
                                {townForm.processing ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
