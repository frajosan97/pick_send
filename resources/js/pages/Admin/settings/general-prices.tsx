// resources/js/pages/Admin/GeneralPrices/Index.tsx
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
import { money } from "@/components/admin/money";
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

    /**
     * Column order:
     *   0 → Code
     *   1 → Label
     *   2 → Price     (numeric)
     *   3 → Packaging (numeric)
     *   4 → Pickup    (numeric)
     *   5 → Sort      (numeric — default sort)
     *   6 → Per kg
     *   7 → Active
     *   8 → Actions
     */
    const tableOptions = useMemo(
        () => ({
            order: [[5, "asc" as const]],
            pageLength: 25,
            columnDefs: [
                { targets: [2, 3, 4, 5], type: "num" as const },
                {
                    targets: 8,
                    orderable: false,
                    searchable: false,
                },
            ],
        }),
        [],
    );

    return (
        <>
            <Head title="General Prices" />
            <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            General Prices
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {prices.length} price
                            {prices.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    <Button onClick={openCreate} aria-label="Create price">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Price
                    </Button>
                </div>

                <SharedDataTable
                    data={prices}
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

                    <Column title="Price" data="price">
                        {(price: number, _t, row: Price) => (
                            <span className="tabular-nums text-sm">
                                {money(price)}
                                {row.per_kg && (
                                    <span className="ml-1 text-xs text-muted-foreground">
                                        /kg
                                    </span>
                                )}
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

                    <Column title="Per kg" data="per_kg">
                        {(perKg: boolean) => (
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold ${
                                    perKg
                                        ? "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200"
                                        : "bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
                                }`}
                            >
                                {perKg ? "Yes" : "No"}
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
                                    title="Edit price"
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
                                    title="Delete price"
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
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Field
                                    label="Code"
                                    error={errors.code}
                                    required
                                >
                                    <TextField
                                        value={data.code}
                                        onChange={(v) =>
                                            setData("code", v.toUpperCase())
                                        }
                                        placeholder="e.g. GEN-1KG"
                                    />
                                </Field>
                                <Field
                                    label="Label"
                                    error={errors.label}
                                    required
                                >
                                    <TextField
                                        value={data.label}
                                        onChange={(v) => setData("label", v)}
                                        placeholder="e.g. 1 kg parcel"
                                    />
                                </Field>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <Field
                                    label="Price (KSh)"
                                    error={errors.price}
                                    hint={
                                        data.per_kg
                                            ? "Charged per kg of weight."
                                            : undefined
                                    }
                                >
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

                            <div className="flex flex-wrap items-center gap-6">
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
                            </div>
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
    breadcrumbs: [{ title: "General Prices", href: "/admin/general-prices" }],
};
