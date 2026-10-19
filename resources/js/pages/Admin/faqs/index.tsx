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
import { Textarea } from "@/components/ui/textarea";
import { Field, TextField } from "@/components/admin/form-field";
import { confirmDelete, toastError, toastSuccess } from "@/lib/toast";
import { RowActions } from "@/components/admin/row-actions";
import { PenIcon, PlusCircle, Trash2 } from "lucide-react";

type Faq = {
    id: number;
    question: string;
    answer: string;
    sort_order: number;
    is_published: boolean;
};

type FaqForm = {
    id?: number;
    question: string;
    answer: string;
    sort_order: number;
    is_published: boolean;
};

const emptyForm: FaqForm = {
    question: "",
    answer: "",
    sort_order: 0,
    is_published: true,
};

export default function Index({ faqs }: { faqs: Faq[] }) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<FaqForm | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } =
        useForm<FaqForm>(emptyForm);

    const openCreate = useCallback(() => {
        reset();
        clearErrors();
        setEditing(null);
        setOpen(true);
    }, [reset, clearErrors]);

    const openEdit = useCallback(
        (f: Faq) => {
            clearErrors();
            setEditing(f);
            setData({
                question: f.question,
                answer: f.answer,
                sort_order: f.sort_order,
                is_published: f.is_published,
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
                            ? "FAQ updated successfully"
                            : "FAQ created successfully",
                    );
                },
                onError: () => toastError("Please fix the errors below"),
                preserveScroll: true,
            };

            if (editing?.id) {
                put(route("admin.faqs.update", editing.id), opts);
            } else {
                post(route("admin.faqs.store"), opts);
            }
        },
        [editing, put, post, closeModal],
    );

    const destroy = useCallback(async (id: number) => {
        const ok = await confirmDelete("This FAQ will be deleted permanently.");
        if (!ok) return;

        router.delete(route("admin.faqs.destroy", id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess("FAQ deleted"),
            onError: () => toastError("Failed to delete FAQ"),
        });
    }, []);

    // Sort by "Sort" column (index 2) ascending; defaults come from wrapper
    const tableOptions = useMemo(
        () => ({
            order: [[2, "asc" as const]],
        }),
        [],
    );

    return (
        <>
            <Head title="FAQs" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">FAQs</h1>
                    <Button onClick={openCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" /> New FAQ
                    </Button>
                </div>

                <div className="ps-datatable overflow-hidden rounded-lg border bg-card p-4">
                    <SharedDataTable
                        data={faqs}
                        className="display w-full"
                        options={tableOptions}
                    >
                        <Column title="Question" data="question">
                            {(question: string) => (
                                <span className="block max-w-xs text-sm font-medium">
                                    {question}
                                </span>
                            )}
                        </Column>

                        <Column title="Answer" data="answer">
                            {(answer: string) => (
                                <span className="block max-w-md text-sm text-muted-foreground">
                                    {answer.length > 140
                                        ? answer.slice(0, 140) + "…"
                                        : answer}
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

                        <Column title="Published" data="is_published">
                            {(is_published: boolean) => (
                                <span
                                    className={
                                        is_published
                                            ? "text-sm text-green-600"
                                            : "text-sm text-muted-foreground"
                                    }
                                >
                                    {is_published ? "Yes" : "No"}
                                </span>
                            )}
                        </Column>

                        <Column
                            title="Actions"
                            data="id"
                            options={{ orderable: false, searchable: false }}
                        >
                            {(id: number, _type: string, row: Faq) => (
                                <RowActions>
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="h-7 w-7"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openEdit(row);
                                        }}
                                        aria-label={`Edit FAQ: ${row.question}`}
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
                                        aria-label={`Delete FAQ: ${row.question}`}
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
                            {editing ? "Edit FAQ" : "New FAQ"}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? "Update the FAQ details."
                                : "Create a new FAQ entry."}
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={submit}
                        className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden"
                    >
                        <DialogBody className="space-y-4">
                            <Field label="Question" error={errors.question}>
                                <TextField
                                    value={data.question}
                                    onChange={(v) => setData("question", v)}
                                />
                            </Field>
                            <Field label="Answer" error={errors.answer}>
                                <Textarea
                                    value={data.answer}
                                    onChange={(e) =>
                                        setData("answer", e.target.value)
                                    }
                                    rows={6}
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
                                    checked={data.is_published}
                                    onCheckedChange={(v) =>
                                        setData("is_published", !!v)
                                    }
                                />
                                <span>Published</span>
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
