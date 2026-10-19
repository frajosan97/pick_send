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
    code: "",
    label: "",
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

    const openCreate = useCallback(() => {
        reset();
        clearErrors();
        setEditing(null);
        setOpen(true);
    }, [reset, clearErrors]);

    const openEdit = useCallback(
        (p: Price) => {
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
                            ? "Price updated successfully"
                            : "Price created successfully",
                    );
                },
                onError: () => toastError("Please fix the errors below"),
                preserveScroll: true,
            };

            if (editing?.id) {
                put(route("admin.general-prices.update", editing.id), opts);
            } else {
                post(route("admin.general-prices.store"), opts);
            }
        },
        [editing, put, post, closeModal],
    );

    const destroy = useCallback(async (id: number) => {
        const ok = await confirmDelete(
            "This price row will be deleted permanently.",
        );
        if (!ok) return;

        router.delete(route("admin.general-prices.destroy", id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess("Price deleted"),
            onError: () => toastError("Failed to delete price"),
        });
    }, []);

    // Only page-specific option; defaults come from SharedDataTable
    const tableOptions = useMemo(
        () => ({
            order: [[5, "asc" as const]], // sort by "Sort" column
        }),
        [],
    );

    return (
        <>
            <Head title="General Prices" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">General Prices</h1>
                    <Button onClick={openCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New Price
                    </Button>
                </div>

                <div className="ps-datatable overflow-hidden rounded-lg border bg-card p-4">
                    <SharedDataTable
                        data={prices}
                        className="display w-full"
                        options={tableOptions}
                    >
                        <Column title="Code" data="code">
                            {(code: string) => (
                                <span className="font-mono text-sm">
                                    {code}
                                </span>
                            )}
                        </Column>

                        <Column title="Label" data="label">
                            {(label: string) => (
                                <span className="text-sm">{label}</span>
                            )}
                        </Column>

                        <Column title="Price (KSh)" data="price">
                            {(price: number) => (
                                <span className="tabular-nums text-sm">
                                    {price.toLocaleString()}
                                </span>
                            )}
                        </Column>

                        <Column title="Packaging" data="packaging">
                            {(packaging: number) => (
                                <span className="tabular-nums text-sm">
                                    {packaging.toLocaleString()}
                                </span>
                            )}
                        </Column>

                        <Column title="Pickup" data="pickup_fee">
                            {(pickup_fee: number) => (
                                <span className="tabular-nums text-sm">
                                    {pickup_fee.toLocaleString()}
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

                        <Column title="Per kg" data="per_kg">
                            {(per_kg: boolean) => (
                                <span className="text-sm text-muted-foreground">
                                    {per_kg ? "Yes" : "No"}
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
                            {(id: number, _type: string, row: Price) => (
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
                            {editing ? "Edit Price" : "New Price"}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? "Update the price row details."
                                : "Create a new general price row."}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={submit}
                        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
                    >
                        <DialogBody className="space-y-4">
                            <Field label="Code" error={errors.code}>
                                <TextField
                                    value={data.code}
                                    onChange={(v) => setData("code", v)}
                                />
                            </Field>
                            <Field label="Label" error={errors.label}>
                                <TextField
                                    value={data.label}
                                    onChange={(v) => setData("label", v)}
                                />
                            </Field>
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
                                    onChange={(v) => setData("packaging", v)}
                                />
                            </Field>
                            <Field
                                label="Pickup Fee (KSh)"
                                error={errors.pickup_fee}
                            >
                                <TextField
                                    type="number"
                                    value={data.pickup_fee}
                                    onChange={(v) => setData("pickup_fee", v)}
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
                                    checked={data.per_kg}
                                    onCheckedChange={(v) =>
                                        setData("per_kg", !!v)
                                    }
                                />
                                <span>Per-kg pricing</span>
                            </label>
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
