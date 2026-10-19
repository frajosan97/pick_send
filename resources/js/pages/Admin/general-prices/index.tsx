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
import { PenIcon, PlusCircle, Trash2 } from 'lucide-react';

type Price = {
    id: number;
    code: string;
    label: string;
    price: number;
    packaging: number;
    pickup_fee: number;
    per_kg: boolean;
    sort_order: number;
    is_active: boolean;
};

type PriceForm = {
    id?: number;
    code: string;
    label: string;
    price: number;
    packaging: number;
    pickup_fee: number;
    per_kg: boolean;
    sort_order: number;
    is_active: boolean;
};

const emptyForm: PriceForm = {
    code: '',
    label: '',
    price: 0,
    packaging: 0,
    pickup_fee: 0,
    per_kg: false,
    sort_order: 0,
    is_active: true,
};

export default function Index({ prices }: { prices: Price[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<PriceForm | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<PriceForm>(emptyForm);

    const openCreate = () => {
        reset();
        clearErrors();
        setEditing(null);
        setOpen(true);
    };

    const openEdit = (p: Price) => {
        clearErrors();
        setEditing(p);
        setData({
            code: p.code,
            label: p.label,
            price: p.price,
            packaging: p.packaging,
            pickup_fee: p.pickup_fee,
            per_kg: p.per_kg,
            sort_order: p.sort_order,
            is_active: p.is_active,
        });
        setOpen(true);
    };

    const closeModal = () => {
        setOpen(false);
        reset();
        clearErrors();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const opts = {
            onSuccess: () => {
                closeModal();
                toastSuccess(
                    editing
                        ? 'Price updated successfully'
                        : 'Price created successfully',
                );
            },
            onError: () => toastError('Please fix the errors below'),
            preserveScroll: true,
        };

        if (editing?.id) {
            put(route('admin.general-prices.update', editing.id), opts);
        } else {
            post(route('admin.general-prices.store'), opts);
        }
    };

    const destroy = async (id: number) => {
        const ok = await confirmDelete(
            'This price row will be deleted permanently.',
        );
        if (!ok) return;
        router.delete(route('admin.general-prices.destroy', id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('Price deleted'),
            onError: () => toastError('Failed to delete price'),
        });
    };

    return (
        <>
            <Head title="General Prices" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">General Prices</h1>
                    <Button onClick={openCreate}>
                        <PlusCircle /> New Price
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left">Code</th>
                                <th className="p-3 text-left">Label</th>
                                <th className="p-3 text-left">Price</th>
                                <th className="p-3 text-left">Packaging</th>
                                <th className="p-3 text-left">Pickup</th>
                                <th className="p-3 text-left">Per kg</th>
                                <th className="p-3 text-left">Active</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prices.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        No prices yet.
                                    </td>
                                </tr>
                            )}
                            {prices.map((p) => (
                                <tr key={p.id} className="border-t">
                                    <td className="p-3 font-mono">{p.code}</td>
                                    <td className="p-3">{p.label}</td>
                                    <td className="p-3">{p.price}</td>
                                    <td className="p-3">{p.packaging}</td>
                                    <td className="p-3">{p.pickup_fee}</td>
                                    <td className="p-3">
                                        {p.per_kg ? 'Yes' : 'No'}
                                    </td>
                                    <td className="p-3">
                                        {p.is_active ? 'Yes' : 'No'}
                                    </td>
                                    <td className="space-x-2 p-3 text-right">
                                        <RowActions>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openEdit(p)}
                                            >
                                                <PenIcon />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => destroy(p.id)}
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

            <Dialog
                open={open}
                onOpenChange={(v) => (v ? setOpen(true) : closeModal())}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? 'Edit Price' : 'New Price'}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Update the price row details.'
                                : 'Create a new general price row.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Code" error={errors.code}>
                            <TextField
                                value={data.code}
                                onChange={(v) => setData('code', v)}
                            />
                        </Field>
                        <Field label="Label" error={errors.label}>
                            <TextField
                                value={data.label}
                                onChange={(v) => setData('label', v)}
                            />
                        </Field>
                        <Field label="Price (KSh)" error={errors.price}>
                            <TextField
                                type="number"
                                value={data.price}
                                onChange={(v) => setData('price', v)}
                            />
                        </Field>
                        <Field label="Packaging (KSh)" error={errors.packaging}>
                            <TextField
                                type="number"
                                value={data.packaging}
                                onChange={(v) => setData('packaging', v)}
                            />
                        </Field>
                        <Field
                            label="Pickup Fee (KSh)"
                            error={errors.pickup_fee}
                        >
                            <TextField
                                type="number"
                                value={data.pickup_fee}
                                onChange={(v) => setData('pickup_fee', v)}
                            />
                        </Field>
                        <Field label="Sort Order" error={errors.sort_order}>
                            <TextField
                                type="number"
                                value={data.sort_order}
                                onChange={(v) => setData('sort_order', v)}
                            />
                        </Field>

                        <label className="flex items-center gap-2">
                            <Checkbox
                                checked={data.per_kg}
                                onCheckedChange={(v) => setData('per_kg', !!v)}
                            />
                            <span>Per-kg pricing</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <Checkbox
                                checked={data.is_active}
                                onCheckedChange={(v) =>
                                    setData('is_active', !!v)
                                }
                            />
                            <span>Active</span>
                        </label>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeModal}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? 'Saving...' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
