// resources/js/pages/Admin/Items/Index.tsx
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
import { Field, SelectField, TextField } from "@/components/admin/form-field";
import { money } from "@/components/admin/money";
import { confirmDelete, toastError, toastSuccess } from "@/lib/toast";
import { RowActions } from "@/components/admin/row-actions";
import { PenIcon, PlusCircle, Trash2 } from "lucide-react";

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
    item_group_id: number | "";
    code: string;
    label: string;
    price: number;
    packaging: number;
    pickup_fee: number;
    sort_order: number;
    is_active: boolean;
};

const emptyForm: ItemForm = {
    item_group_id: "",
    code: "",
    label: "",
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

    const openCreate = useCallback(() => {
        reset();
        clearErrors();
        setEditing(null);
        setOpen(true);
    }, [reset, clearErrors]);

    const openEdit = useCallback(
        (i: Item) => {
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
                            ? "Item updated successfully"
                            : "Item created successfully",
                    );
                },
                onError: () => toastError("Please fix the errors below"),
                preserveScroll: true,
            };

            if (editing?.id) {
                put(route("admin.items.update", editing.id), opts);
            } else {
                post(route("admin.items.store"), opts);
            }
        },
        [editing, put, post, closeModal],
    );

    const destroy = useCallback(async (id: number) => {
        const ok = await confirmDelete(
            "This item will be deleted permanently.",
        );
        if (!ok) return;

        router.delete(route("admin.items.destroy", id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess("Item deleted"),
            onError: () => toastError("Failed to delete item"),
        });
    }, []);

    /**
     * Column order:
     *   0 → Code
     *   1 → Label
     *   2 → Group
     *   3 → Price     (numeric)
     *   4 → Packaging (numeric)
     *   5 → Pickup    (numeric)
     *   6 → Sort      (numeric — default sort)
     *   7 → Active
     *   8 → Actions
     */
    const tableOptions = useMemo(
        () => ({
            order: [[6, "asc" as const]],
            pageLength: 25,
            columnDefs: [
                { targets: [3, 4, 5, 6], type: "num" as const },
                {
                    targets: 8,
                    orderable: false,
                    searchable: false,
                },
            ],
        }),
        [],
    );

    const groupOptions = useMemo(
        () =>
            groups.map((g) => ({
                value: g.id,
                label: g.name,
            })),
        [groups],
    );

    return (
        <>
            <Head title="Items" />
            <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">Items</h1>
                        <p className="text-sm text-muted-foreground">
                            {items.length} item
                            {items.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    <Button onClick={openCreate} aria-label="Create item">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Item
                    </Button>
                </div>

                <SharedDataTable
                    data={items}
                    className="display w-full"
                    options={tableOptions}
                >
                    <Column title="Code" data="code">
                        {(code: string) => (
                            <span className="font-mono text-sm font-medium">
                                {code}
                            </span>
                        )}
                    </Column>

                    <Column title="Label" data="label">
                        {(label: string) => (
                            <span className="text-sm">{label}</span>
                        )}
                    </Column>

                    <Column title="Group" data="group.name">
                        {(_v: string | null, _t: string, row: Item) => (
                            <span className="text-sm text-muted-foreground">
                                {row.group?.name ?? "—"}
                            </span>
                        )}
                    </Column>

                    <Column title="Price" data="price">
                        {(price: number) => (
                            <span className="tabular-nums text-sm">
                                {money(price)}
                            </span>
                        )}
                    </Column>

                    <Column title="Packaging" data="packaging">
                        {(packaging: number) => (
                            <span className="tabular-nums text-sm">
                                {money(packaging)}
                            </span>
                        )}
                    </Column>

                    <Column title="Pickup" data="pickup_fee">
                        {(pickupFee: number) => (
                            <span className="tabular-nums text-sm">
                                {money(pickupFee)}
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
                        {(id: number, _type: string, row: Item) => (
                            <RowActions>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEdit(row);
                                    }}
                                    aria-label={`Edit ${row.label}`}
                                    title="Edit item"
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
                                    aria-label={`Delete ${row.label}`}
                                    title="Delete item"
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
                            {editing ? "Edit Item" : "New Item"}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? "Update the item details."
                                : "Create a new item."}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={submit}
                        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
                    >
                        <DialogBody className="space-y-4">
                            <Field
                                label="Group"
                                error={errors.item_group_id}
                                required
                            >
                                <SelectField
                                    value={data.item_group_id}
                                    onChange={(v) =>
                                        setData(
                                            "item_group_id",
                                            v === "" ? "" : Number(v),
                                        )
                                    }
                                    options={groupOptions}
                                    placeholder="— Select group —"
                                />
                            </Field>
                            <Field label="Code" error={errors.code} required>
                                <TextField
                                    value={data.code}
                                    onChange={(v) =>
                                        setData("code", v.toUpperCase())
                                    }
                                    placeholder="e.g. DOC-A4"
                                />
                            </Field>
                            <Field label="Label" error={errors.label} required>
                                <TextField
                                    value={data.label}
                                    onChange={(v) => setData("label", v)}
                                    placeholder="e.g. A4 Envelope"
                                />
                            </Field>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <Field label="Price (KSh)" error={errors.price}>
                                    <TextField
                                        type="number"
                                        value={data.price}
                                        onChange={(v) => setData("price", v)}
                                    />
                                </Field>
                                <Field
                                    label="Packaging (KSh)"
                                    error={errors.packaging}
                                >
                                    <TextField
                                        type="number"
                                        value={data.packaging}
                                        onChange={(v) =>
                                            setData("packaging", v)
                                        }
                                    />
                                </Field>
                                <Field
                                    label="Pickup (KSh)"
                                    error={errors.pickup_fee}
                                >
                                    <TextField
                                        type="number"
                                        value={data.pickup_fee}
                                        onChange={(v) =>
                                            setData("pickup_fee", v)
                                        }
                                    />
                                </Field>
                            </div>
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
    breadcrumbs: [{ title: "Items", href: "/admin/items" }],
};
