// resources/js/pages/Admin/ItemGroups/Index.tsx
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
        setEditing(null);
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

    /**
     * Column order:
     *   0 → Name
     *   1 → Slug
     *   2 → Items (numeric)
     *   3 → Sort  (numeric — default sort)
     *   4 → Active
     *   5 → Actions
     */
    const tableOptions = useMemo(
        () => ({
            order: [[3, "asc" as const]],
            pageLength: 25,
            columnDefs: [
                { targets: [2, 3], type: "num" as const },
                {
                    targets: 5,
                    orderable: false,
                    searchable: false,
                },
            ],
        }),
        [],
    );

    return (
        <>
            <Head title="Item Groups" />
            <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Item Groups</h1>
                        <p className="text-sm text-muted-foreground">
                            {groups.length} group
                            {groups.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    <Button onClick={openCreate} aria-label="Create item group">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Group
                    </Button>
                </div>

                <SharedDataTable
                    data={groups}
                    className="display w-full"
                    options={tableOptions}
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

                    <Column title="Items" data="items_count">
                        {(count: number) => (
                            <span className="tabular-nums text-sm">
                                {count}
                            </span>
                        )}
                    </Column>

                    <Column title="Sort" data="sort_order">
                        {(sortOrder: number) => (
                            <span className="tabular-nums text-sm">
                                {sortOrder}
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
                                    title="Edit group"
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
                                    title="Delete group"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </RowActions>
                        )}
                    </Column>
                </SharedDataTable>
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
                                    placeholder="e.g. Documents"
                                />
                            </Field>
                            <Field label="Slug" error={errors.slug}>
                                <TextField
                                    value={data.slug}
                                    onChange={(v) => setData("slug", v)}
                                    placeholder="documents"
                                />
                            </Field>
                            <Field
                                label="Sort Order"
                                error={errors.sort_order}
                                hint="Lower numbers appear first."
                            >
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
                                {processing ? "Saving…" : "Save"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: "Item Groups", href: "/admin/item-groups" }],
};
