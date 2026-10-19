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
import { Field, TextField } from '@/components/admin/form-field';
import { confirmDelete, toastError, toastSuccess } from '@/lib/toast';
import { RowActions } from '@/components/admin/row-actions';
import { PenIcon, PlusCircle, Trash2 } from 'lucide-react';

type Constant = {
    id: number;
    key: string;
    value: number;
    description: string | null;
};

type ConstantForm = {
    id?: number;
    key: string;
    value: number;
    description: string | null;
};

const emptyForm: ConstantForm = { key: '', value: 0, description: '' };

export default function Index({ constants }: { constants: Constant[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ConstantForm | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<ConstantForm>(emptyForm);

    const openCreate = () => {
        reset();
        clearErrors();
        setEditing(null);
        setOpen(true);
    };

    const openEdit = (c: Constant) => {
        clearErrors();
        setEditing(c);
        setData({
            key: c.key,
            value: c.value,
            description: c.description ?? '',
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
                        ? 'Constant updated successfully'
                        : 'Constant created successfully',
                );
            },
            onError: () => toastError('Please fix the errors below'),
            preserveScroll: true,
        };

        if (editing?.id) {
            put(route('admin.pricing-constants.update', editing.id), opts);
        } else {
            post(route('admin.pricing-constants.store'), opts);
        }
    };

    const destroy = async (id: number) => {
        const ok = await confirmDelete(
            'This constant will be deleted permanently.',
        );
        if (!ok) return;

        router.delete(route('admin.pricing-constants.destroy', id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('Constant deleted'),
            onError: () => toastError('Failed to delete constant'),
        });
    };

    return (
        <>
            <Head title="Pricing Constants" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">
                        Pricing Constants
                    </h1>
                    <Button onClick={openCreate}>
                        <PlusCircle /> New Constant
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left">Key</th>
                                <th className="p-3 text-left">Value</th>
                                <th className="p-3 text-left">Description</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {constants.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        No constants yet.
                                    </td>
                                </tr>
                            )}
                            {constants.map((c) => (
                                <tr key={c.id} className="border-t">
                                    <td className="p-3 font-mono">{c.key}</td>
                                    <td className="p-3">{c.value}</td>
                                    <td className="p-3 text-muted-foreground">
                                        {c.description}
                                    </td>
                                    <td className="space-x-2 p-3 text-right">
                                        <RowActions>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openEdit(c)}
                                            >
                                                <PenIcon />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => destroy(c.id)}
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
                            {editing ? 'Edit Constant' : 'New Constant'}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Update the pricing constant details.'
                                : 'Create a new pricing constant.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Key" error={errors.key}>
                            <TextField
                                value={data.key}
                                onChange={(v) => setData('key', v)}
                            />
                        </Field>
                        <Field label="Value" error={errors.value}>
                            <TextField
                                type="number"
                                value={data.value}
                                onChange={(v) => setData('value', v)}
                            />
                        </Field>
                        <Field label="Description" error={errors.description}>
                            <TextField
                                value={data.description ?? ''}
                                onChange={(v) => setData('description', v)}
                            />
                        </Field>

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
