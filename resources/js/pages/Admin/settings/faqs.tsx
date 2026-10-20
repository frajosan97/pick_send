// resources/js/pages/Admin/Faqs/Index.tsx
import { Head, router, useForm } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';
import SharedDataTable, { Column } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Field, TextField } from '@/components/admin/form-field';
import { confirmDelete, toastError, toastSuccess } from '@/lib/toast';
import { RowActions } from '@/components/admin/row-actions';
import { PenIcon, PlusCircle, Trash2 } from 'lucide-react';

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
    question: '',
    answer: '',
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
                            ? 'FAQ updated successfully'
                            : 'FAQ created successfully',
                    );
                },
                onError: () => toastError('Please fix the errors below'),
                preserveScroll: true,
            };

            if (editing?.id) {
                put(route('admin.faqs.update', editing.id), opts);
            } else {
                post(route('admin.faqs.store'), opts);
            }
        },
        [editing, put, post, closeModal],
    );

    const destroy = useCallback(async (id: number) => {
        const ok = await confirmDelete(
            'This FAQ will be deleted permanently.',
        );
        if (!ok) return;

        router.delete(route('admin.faqs.destroy', id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('FAQ deleted'),
            onError: () => toastError('Failed to delete FAQ'),
        });
    }, []);

    /**
     * Column order:
     *   0 → Question
     *   1 → Answer
     *   2 → Sort       (numeric sort)
     *   3 → Published  (string sort)
     *   4 → Actions    (not sortable / not searchable)
     *
     * Every column is present in the definitions below, so
     * `targets` indices line up exactly with the table.
     */
    const tableOptions = useMemo(
        () => ({
            order: [[2, 'asc' as const]],
            pageLength: 25,
            columnDefs: [
                { targets: 2, type: 'num' as const }, // Sort
                {
                    targets: 4, // Actions
                    orderable: false,
                    searchable: false,
                },
            ],
        }),
        [],
    );

    return (
        <>
            <Head title="FAQs" />
            <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-semibold">FAQs</h1>
                        <p className="text-sm text-muted-foreground">
                            {faqs.length} entr{faqs.length === 1 ? 'y' : 'ies'}
                        </p>
                    </div>
                    <Button onClick={openCreate} aria-label="Create FAQ">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New FAQ
                    </Button>
                </div>

                <SharedDataTable
                    data={faqs}
                    className="display w-full"
                    options={tableOptions}
                >
                    <Column title="Question" data="question">
                        {(question: string) => (
                            <span
                                className="block max-w-xs truncate text-sm font-medium"
                                title={question}
                            >
                                {question}
                            </span>
                        )}
                    </Column>

                    <Column title="Answer" data="answer">
                        {(answer: string) => (
                            <span
                                className="block max-w-md truncate text-sm text-muted-foreground"
                                title={answer}
                            >
                                {answer}
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

                    <Column title="Published" data="is_published">
                        {(isPublished: boolean) => (
                            <span
                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[.72rem] font-semibold ${
                                    isPublished
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                                        : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                                }`}
                            >
                                {isPublished ? 'Published' : 'Draft'}
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
                                    title="Edit FAQ"
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
                                    title="Delete FAQ"
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

            <Dialog
                open={open}
                onOpenChange={(v) => (v ? setOpen(true) : closeModal())}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? 'Edit FAQ' : 'New FAQ'}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Update the FAQ details.'
                                : 'Create a new FAQ entry.'}
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
                                    onChange={(v) => setData('question', v)}
                                    placeholder="e.g. How do I track my parcel?"
                                />
                            </Field>
                            <Field label="Answer" error={errors.answer}>
                                <Textarea
                                    value={data.answer}
                                    onChange={(e) =>
                                        setData('answer', e.target.value)
                                    }
                                    rows={6}
                                    placeholder="Keep it short and useful."
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
                                    onChange={(v) => setData('sort_order', v)}
                                />
                            </Field>
                            <label className="flex items-center gap-2">
                                <Checkbox
                                    checked={data.is_published}
                                    onCheckedChange={(v) =>
                                        setData('is_published', !!v)
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
                                {processing ? 'Saving…' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

Index.layout = {
    breadcrumbs: [{ title: 'FAQs', href: '/admin/faqs' }],
};