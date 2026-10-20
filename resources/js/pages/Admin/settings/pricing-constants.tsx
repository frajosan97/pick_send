// resources/js/pages/Admin/PricingConstants/Index.tsx
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
import { Field, TextField } from "@/components/admin/form-field";
import { confirmDelete, toastError, toastSuccess } from "@/lib/toast";
import { RowActions } from "@/components/admin/row-actions";
import { PenIcon, PlusCircle, Trash2 } from "lucide-react";

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

const emptyForm: ConstantForm = { key: "", value: 0, description: "" };

export default function Index({ constants }: { constants: Constant[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ConstantForm | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<ConstantForm>(emptyForm);

    const openCreate = useCallback(() => {
        reset();
        clearErrors();
        setEditing(null);
        setOpen(true);
    }, [reset, clearErrors]);

    const openEdit = useCallback(
        (c: Constant) => {
            clearErrors();
            setEditing(c);
            setData({
                key: c.key,
                value: c.value,
                description: c.description ?? "",
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
                            ? "Constant updated successfully"
                            : "Constant created successfully",
                    );
                },
                onError: () => toastError("Please fix the errors below"),
                preserveScroll: true,
            };

            if (editing?.id) {
                put(route("admin.pricing-constants.update", editing.id), opts);
            } else {
                post(route("admin.pricing-constants.store"), opts);
            }
        },
        [editing, put, post, closeModal],
    );

    const destroy = useCallback(async (id: number) => {
        const ok = await confirmDelete(
            "This constant will be deleted permanently.",
        );
        if (!ok) return;

        router.delete(route("admin.pricing-constants.destroy", id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess("Constant deleted"),
            onError: () => toastError("Failed to delete constant"),
        });
    }, []);

    /**
     * Column order:
     *   0 → Key
     *   1 → Value  (numeric)
     *   2 → Description
     *   3 → Actions
     */
    const tableOptions = useMemo(
        () => ({
            order: [[0, "asc" as const]],
            pageLength: 50,
            columnDefs: [
                { targets: 1, type: "num" as const },
                {
                    targets: 3,
                    orderable: false,
                    searchable: false,
                },
            ],
        }),
        [],
    );

    return (
        <>
            <Head title="Pricing Constants" />
            <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Pricing Constants
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {constants.length} constant
                            {constants.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    <Button onClick={openCreate} aria-label="Create constant">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Constant
                    </Button>
                </div>

                <SharedDataTable
                    data={constants}
                    className="display w-full"
                    options={tableOptions}
                >
                    <Column title="Key" data="key">
                        {(key: string) => (
                            <span className="font-mono text-sm font-medium">
                                {key}
                            </span>
                        )}
                    </Column>

                    <Column title="Value" data="value">
                        {(value: number) => (
                            <span className="tabular-nums text-sm">
                                {value.toLocaleString("en-KE")}
                            </span>
                        )}
                    </Column>

                    <Column title="Description" data="description">
                        {(description: string | null) => (
                            <span
                                className="block max-w-md truncate text-sm text-muted-foreground"
                                title={description ?? ""}
                            >
                                {description || "—"}
                            </span>
                        )}
                    </Column>

                    <Column
                        title="Actions"
                        data="id"
                        options={{ orderable: false, searchable: false }}
                    >
                        {(id: number, _type: string, row: Constant) => (
                            <RowActions>
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openEdit(row);
                                    }}
                                    aria-label={`Edit ${row.key}`}
                                    title="Edit constant"
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
                                    aria-label={`Delete ${row.key}`}
                                    title="Delete constant"
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
                            {editing ? "Edit Constant" : "New Constant"}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? "Update the pricing constant details."
                                : "Create a new pricing constant."}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={submit}
                        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
                    >
                        <DialogBody className="space-y-4">
                            <Field
                                label="Key"
                                error={errors.key}
                                required
                                hint="Lowercase snake_case, e.g. cod_rate"
                            >
                                <TextField
                                    value={data.key}
                                    onChange={(v) =>
                                        setData(
                                            "key",
                                            v
                                                .toLowerCase()
                                                .replace(/[^a-z0-9_]/g, "_"),
                                        )
                                    }
                                    placeholder="e.g. cod_rate"
                                    className="font-mono"
                                />
                            </Field>
                            <Field
                                label="Value"
                                error={errors.value}
                                required
                                hint="Integer. Unit depends on the key (percent, KSh, count, …)."
                            >
                                <TextField
                                    type="number"
                                    value={data.value}
                                    onChange={(v) => setData("value", v)}
                                />
                            </Field>
                            <Field
                                label="Description"
                                error={errors.description}
                                hint="What this constant controls, in plain language."
                            >
                                <TextField
                                    value={data.description ?? ""}
                                    onChange={(v) => setData("description", v)}
                                    placeholder="e.g. COD fee charged as a percentage of the parcel value"
                                />
                            </Field>
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
    breadcrumbs: [
        { title: "Pricing Constants", href: "/admin/pricing-constants" },
    ],
};
