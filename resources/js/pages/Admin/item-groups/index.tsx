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

type Group = {
    id: number;
    name: string;
    slug: string;
    sort_order: number;
    is_active: boolean;
    items_count: number;
};

type GroupForm = {
    id?: number;
    name: string;
    slug: string;
    sort_order: number;
    is_active: boolean;
};

const emptyForm: GroupForm = {
    name: '',
    slug: '',
    sort_order: 0,
    is_active: true,
};

export default function Index({ groups }: { groups: Group[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<GroupForm | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<GroupForm>(emptyForm);

    const openCreate = () => {
        reset();
        clearErrors();
        setEditing(null);
        setOpen(true);
    };

    const openEdit = (g: Group) => {
        clearErrors();
        setEditing(g);
        setData({
            name: g.name,
            slug: g.slug,
            sort_order: g.sort_order,
            is_active: g.is_active,
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
                        ? 'Group updated successfully'
                        : 'Group created successfully',
                );
            },
            onError: () => toastError('Please fix the errors below'),
            preserveScroll: true,
        };

        if (editing?.id) {
            put(route('admin.item-groups.update', editing.id), opts);
        } else {
            post(route('admin.item-groups.store'), opts);
        }
    };

    const destroy = async (id: number) => {
        const ok = await confirmDelete(
            'Deleting this group will also affect its items. Continue?',
        );
        if (!ok) return;
        router.delete(route('admin.item-groups.destroy', id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('Group deleted'),
            onError: () => toastError('Failed to delete group'),
        });
    };

    return (
        <>
            <Head title="Item Groups" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Item Groups</h1>
                    <Button onClick={openCreate}>
                        <PlusCircle /> New Group
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3 text-left">Slug</th>
                                <th className="p-3 text-left">Items</th>
                                <th className="p-3 text-left">Sort</th>
                                <th className="p-3 text-left">Active</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groups.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        No groups yet.
                                    </td>
                                </tr>
                            )}
                            {groups.map((g) => (
                                <tr key={g.id} className="border-t">
                                    <td className="p-3">{g.name}</td>
                                    <td className="p-3 font-mono text-xs">
                                        {g.slug}
                                    </td>
                                    <td className="p-3">{g.items_count}</td>
                                    <td className="p-3">{g.sort_order}</td>
                                    <td className="p-3">
                                        {g.is_active ? 'Yes' : 'No'}
                                    </td>
                                    <td className="space-x-2 p-3 text-right">
                                        <RowActions>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openEdit(g)}
                                            >
                                                <PenIcon />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => destroy(g.id)}
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
                            {editing ? 'Edit Group' : 'New Group'}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Update the item group details.'
                                : 'Create a new item group.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Name" error={errors.name}>
                            <TextField
                                value={data.name}
                                onChange={(v) => {
                                    setData('name', v);
                                    setData(
                                        'slug',
                                        v
                                            .toLowerCase()
                                            .replace(/[^a-z0-9]+/g, '-')
                                            .replace(/^-|-$/g, ''),
                                    );
                                }}
                            />
                        </Field>
                        <Field label="Slug" error={errors.slug}>
                            <TextField
                                value={data.slug}
                                onChange={(v) => setData('slug', v)}
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
