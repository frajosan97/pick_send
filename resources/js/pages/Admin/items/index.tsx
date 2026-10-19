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

type Group = { id: number; name: string };

type Item = {
    id: number;
    item_group_id: number;
    code: string;
    label: string;
    price: number;
    packaging: number;
    pickup_fee: number;
    sort_order: number;
    is_active: boolean;
    group?: { id: number; name: string } | null;
};

type ItemForm = {
    id?: number;
    item_group_id: number | '';
    code: string;
    label: string;
    price: number;
    packaging: number;
    pickup_fee: number;
    sort_order: number;
    is_active: boolean;
};

const emptyForm: ItemForm = {
    item_group_id: '',
    code: '',
    label: '',
    price: 0,
    packaging: 0,
    pickup_fee: 0,
    sort_order: 0,
    is_active: true,
};

export default function Index({
    items,
    groups,
}: {
    items: Item[];
    groups: Group[];
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ItemForm | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<ItemForm>(emptyForm);

    const openCreate = () => {
        reset();
        clearErrors();
        setEditing(null);
        setOpen(true);
    };

    const openEdit = (i: Item) => {
        clearErrors();
        setEditing(i);
        setData({
            item_group_id: i.item_group_id,
            code: i.code,
            label: i.label,
            price: i.price,
            packaging: i.packaging,
            pickup_fee: i.pickup_fee,
            sort_order: i.sort_order,
            is_active: i.is_active,
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
                        ? 'Item updated successfully'
                        : 'Item created successfully',
                );
            },
            onError: () => toastError('Please fix the errors below'),
            preserveScroll: true,
        };

        if (editing?.id) {
            put(route('admin.items.update', editing.id), opts);
        } else {
            post(route('admin.items.store'), opts);
        }
    };

    const destroy = async (id: number) => {
        const ok = await confirmDelete(
            'This item will be deleted permanently.',
        );
        if (!ok) return;
        router.delete(route('admin.items.destroy', id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('Item deleted'),
            onError: () => toastError('Failed to delete item'),
        });
    };

    return (
        <>
            <Head title="Items" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Items</h1>
                    <Button onClick={openCreate}>
                        <PlusCircle /> New Item
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left">Code</th>
                                <th className="p-3 text-left">Label</th>
                                <th className="p-3 text-left">Group</th>
                                <th className="p-3 text-left">Price</th>
                                <th className="p-3 text-left">Packaging</th>
                                <th className="p-3 text-left">Pickup</th>
                                <th className="p-3 text-left">Active</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        No items yet.
                                    </td>
                                </tr>
                            )}
                            {items.map((i) => (
                                <tr key={i.id} className="border-t">
                                    <td className="p-3 font-mono">{i.code}</td>
                                    <td className="p-3">{i.label}</td>
                                    <td className="p-3 text-muted-foreground">
                                        {i.group?.name ?? '—'}
                                    </td>
                                    <td className="p-3">{i.price}</td>
                                    <td className="p-3">{i.packaging}</td>
                                    <td className="p-3">{i.pickup_fee}</td>
                                    <td className="p-3">
                                        {i.is_active ? 'Yes' : 'No'}
                                    </td>
                                    <td className="space-x-2 p-3 text-right">
                                        <RowActions>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openEdit(i)}
                                            >
                                                <PenIcon />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => destroy(i.id)}
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
                            {editing ? 'Edit Item' : 'New Item'}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Update the item details.'
                                : 'Create a new item.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Group" error={errors.item_group_id}>
                            <select
                                value={data.item_group_id}
                                onChange={(e) =>
                                    setData(
                                        'item_group_id',
                                        e.target.value
                                            ? Number(e.target.value)
                                            : '',
                                    )
                                }
                                className="h-9 w-full rounded-md border bg-transparent px-3"
                            >
                                <option value="">— Select group —</option>
                                {groups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.name}
                                    </option>
                                ))}
                            </select>
                        </Field>
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
