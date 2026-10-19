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
import { PenIcon, PlusCircle, Trash2 } from "lucide-react";

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
    name: "",
    slug: "",
    sort_order: 0,
    is_active: true,
};

const slugify = (v: string) =>
    v
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

export default function Index({ groups }: { groups: Group[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<GroupForm | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<GroupForm>(emptyForm);

    const openCreate = useCallback(() => {
        reset();
        clearErrors();
        setEditing(null);
        setOpen(true);
    }, [reset, clearErrors]);

    const openEdit = useCallback(
        (g: Group) => {
            clearErrors();
            setEditing(g);
            setData({
                name: g.name,
                slug: g.slug,
                sort_order: g.sort_order,
                is_active: g.is_active,
            });
            setOpen(true);
        },
        [setData, clearErrors],
    );

    const closeModal = useCallback(() => {
        setOpen(false);
        reset();
        clearErrors();
    }, [reset, clearErrors]);

    const submit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            const opts = {
                onSuccess: () => {
                    closeModal();
                    toastSuccess(
                        editing
                            ? "Group updated successfully"
                            : "Group created successfully",
                    );
                },
                onError: () => toastError("Please fix the errors below"),
                preserveScroll: true,
            };

            if (editing?.id) {
                put(route("admin.item-groups.update", editing.id), opts);
            } else {
                post(route("admin.item-groups.store"), opts);
            }
        },
        [editing, put, post, closeModal],
    );

    const destroy = useCallback(async (id: number) => {
        const ok = await confirmDelete(
            "Deleting this group will also affect its items. Continue?",
        );
        if (!ok) return;

        router.delete(route("admin.item-groups.destroy", id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess("Group deleted"),
            onError: () => toastError("Failed to delete group"),
        });
    }, []);

    // Sort by "Sort" column (index 3) ascending; defaults come from wrapper
    const tableOptions = useMemo(
        () => ({
            order: [[3, "asc" as const]],
        }),
        [],
    );

    return (
        <>
            <Head title="Item Groups" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">Item Groups</h1>
                    <Button onClick={openCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Group
                    </Button>
                </div>

                <div className="ps-datatable overflow-hidden rounded-lg border bg-card p-4">
                    <SharedDataTable
                        data={groups}
                        className="display w-full"
                        options={tableOptions}
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

                        <Column title="Items" data="items_count">
                            {(count: number) => (
                                <span className="tabular-nums text-sm">
                                    {count}
                                </span>
                            )}
                        </Column>

                        <Column title="Sort" data="sort_order">
                            {(sort_order: number) => (
                                <span className="tabular-nums text-sm">
                                    {sort_order}
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
                            {(id: number, _type: string, row: Group) => (
                                <RowActions>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEdit(row);
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
                                            destroy(id);
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

            <Dialog
                open={open}
                onOpenChange={(v) => (v ? setOpen(true) : closeModal())}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Edit Group" : "New Group"}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? "Update the item group details."
                                : "Create a new item group."}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={submit}
                        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
                    >
                        <DialogBody className="space-y-4">
                            <Field label="Name" error={errors.name}>
                                <TextField
                                    value={data.name}
                                    onChange={(v) => {
                                        setData("name", v);
                                        setData("slug", slugify(v));
                                    }}
                                />
                            </Field>
                            <Field label="Slug" error={errors.slug}>
                                <TextField
                                    value={data.slug}
                                    onChange={(v) => setData("slug", v)}
                                />
                            </Field>
                            <Field label="Sort Order" error={errors.sort_order}>
                                <TextField
                                    type="number"
                                    value={data.sort_order}
                                    onChange={(v) => setData("sort_order", v)}
                                />
                            </Field>
                            <label className="flex items-center gap-2">
                                <Checkbox
                                    checked={data.is_active}
                                    onCheckedChange={(v) =>
                                        setData("is_active", !!v)
                                    }
                                />
                                <span>Active</span>
                            </label>
                        </DialogBody>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeModal}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {processing ? "Saving..." : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
