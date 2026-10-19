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
import { Textarea } from '@/components/ui/textarea';
import { Field, TextField } from '@/components/admin/form-field';
import { confirmDelete, toastError, toastSuccess } from '@/lib/toast';
import { PenIcon, PlusCircle, Trash2 } from 'lucide-react';
import { RowActions } from '@/components/admin/row-actions';

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

    const openCreate = () => {
        reset();
        clearErrors();
        setEditing(null);
        setOpen(true);
    };

    const openEdit = (f: Faq) => {
        clearErrors();
        setEditing(f);
        setData({
            question: f.question,
            answer: f.answer,
            sort_order: f.sort_order,
            is_published: f.is_published,
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
    };

    const destroy = async (id: number) => {
        const ok = await confirmDelete('This FAQ will be deleted permanently.');
        if (!ok) return;
        router.delete(route('admin.faqs.destroy', id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('FAQ deleted'),
            onError: () => toastError('Failed to delete FAQ'),
        });
    };

    return (
        <>
            <Head title="FAQs" />
            <div className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">FAQs</h1>
                    <Button onClick={openCreate}>
                        <PlusCircle /> New FAQ
                    </Button>
                </div>

                <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted">
                            <tr>
                                <th className="p-3 text-left">Question</th>
                                <th className="p-3 text-left">Answer</th>
                                <th className="p-3 text-left">Sort</th>
                                <th className="p-3 text-left">Published</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faqs.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="p-6 text-center text-muted-foreground"
                                    >
                                        No FAQs yet.
                                    </td>
                                </tr>
                            )}
                            {faqs.map((f) => (
                                <tr key={f.id} className="border-t align-top">
                                    <td className="max-w-xs p-3 font-medium">
                                        {f.question}
                                    </td>
                                    <td className="max-w-md p-3 text-muted-foreground">
                                        {f.answer.length > 140
                                            ? f.answer.slice(0, 140) + '…'
                                            : f.answer}
                                    </td>
                                    <td className="p-3">{f.sort_order}</td>
                                    <td className="p-3">
                                        {f.is_published ? 'Yes' : 'No'}
                                    </td>
                                    <td className="space-x-2 p-3 text-right">
                                        <RowActions>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openEdit(f)}
                                            >
                                                <PenIcon />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => destroy(f.id)}
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
                            {editing ? 'Edit FAQ' : 'New FAQ'}
                        </DialogTitle>
                        <DialogDescription>
                            {editing
                                ? 'Update the FAQ details.'
                                : 'Create a new FAQ entry.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submit} className="space-y-4">
                        <Field label="Question" error={errors.question}>
                            <TextField
                                value={data.question}
                                onChange={(v) => setData('question', v)}
                            />
                        </Field>
                        <Field label="Answer" error={errors.answer}>
                            <Textarea
                                value={data.answer}
                                onChange={(e) =>
                                    setData('answer', e.target.value)
                                }
                                rows={6}
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
                                checked={data.is_published}
                                onCheckedChange={(v) =>
                                    setData('is_published', !!v)
                                }
                            />
                            <span>Published</span>
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
