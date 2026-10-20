// resources/js/components/admin/parcel-modals.tsx
import { useForm } from "@inertiajs/react";
import { useCallback } from "react";
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
import { toastError, toastSuccess } from "@/lib/toast";
import { money } from "./money";

/**
 * Every modal in this file reserves an `action` key on its form type.
 * The server can return `back()->withErrors(['action' => '…'])` for
 * cross-field / non-field errors, and TypeScript needs that key to
 * exist on the error bag so `errors.action` compiles.
 *
 * The key is never set via `setData`, and `JSON.stringify` drops
 * `undefined` values, so the submitted payload is unchanged.
 */

/* ---------------- Retry STK ---------------- */

type RetryForm = { action?: string };

export function RetryStkModal({
    open,
    onClose,
    parcelId,
    paymentId,
}: {
    open: boolean;
    onClose: () => void;
    parcelId: number;
    paymentId: number | null;
}) {
    const { post, processing, errors, reset, clearErrors } = useForm<RetryForm>(
        {},
    );

    const submit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (!paymentId) return;

            post(route("admin.parcels.retry-stk", parcelId), {
                preserveScroll: true,
                onSuccess: () => {
                    toastSuccess("STK prompt re-sent.");
                    reset();
                    clearErrors();
                    onClose();
                },
                onError: (e) => toastError(e.action ?? "Failed to retry STK."),
            });
        },
        [paymentId, parcelId, post, reset, clearErrors, onClose],
    );

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Retry STK prompt</DialogTitle>
                    <DialogDescription>
                        The customer will receive a new M-PESA prompt on their
                        phone. This creates a new transaction attempt linked to
                        the existing payment.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit}>
                    <DialogBody className="space-y-3 text-sm">
                        {errors.action && (
                            <p className="text-destructive text-sm">
                                {errors.action}
                            </p>
                        )}
                        <p>Are you sure you want to re-send the prompt?</p>
                    </DialogBody>
                    <DialogFooter className="gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? "Sending…" : "Send prompt"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* ---------------- Attach M-PESA code ---------------- */

type ClaimForm = { code: string; action?: string };

export function ClaimCodeModal({
    open,
    onClose,
    parcelId,
}: {
    open: boolean;
    onClose: () => void;
    parcelId: number;
}) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<ClaimForm>({ code: "" });

    const submit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            post(route("admin.parcels.claim", parcelId), {
                preserveScroll: true,
                onSuccess: () => {
                    toastSuccess("M-PESA code recorded.");
                    reset();
                    clearErrors();
                    onClose();
                },
                onError: (e) =>
                    toastError(
                        e.action ??
                            e.code ??
                            "Invalid code or parcel not payable.",
                    ),
            });
        },
        [parcelId, post, reset, clearErrors, onClose],
    );

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Attach M-PESA code</DialogTitle>
                    <DialogDescription>
                        Use this when a customer paid manually and provided the
                        M-PESA receipt out-of-band. The code will be verified on
                        the next reconciliation.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit}>
                    <DialogBody className="space-y-3">
                        <Field label="M-PESA code" error={errors.code}>
                            <TextField
                                value={data.code}
                                onChange={(v) =>
                                    setData("code", v.toUpperCase())
                                }
                                // placeholder="e.g. UJKI0AQ0JE"
                            />
                        </Field>
                        {errors.action && (
                            <p className="text-destructive text-sm">
                                {errors.action}
                            </p>
                        )}
                    </DialogBody>
                    <DialogFooter className="gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? "Saving…" : "Attach"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* ---------------- Mark paid manually ---------------- */

type MarkPaidForm = { reason: string; action?: string };

export function MarkPaidModal({
    open,
    onClose,
    parcelId,
}: {
    open: boolean;
    onClose: () => void;
    parcelId: number;
}) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<MarkPaidForm>({ reason: "" });

    const submit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            post(route("admin.parcels.mark-paid", parcelId), {
                preserveScroll: true,
                onSuccess: () => {
                    toastSuccess("Parcel marked as paid.");
                    reset();
                    clearErrors();
                    onClose();
                },
                onError: (e) =>
                    toastError(
                        e.action ?? e.reason ?? "Could not mark parcel paid.",
                    ),
            });
        },
        [parcelId, post, reset, clearErrors, onClose],
    );

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Mark parcel paid manually</DialogTitle>
                    <DialogDescription>
                        This overrides the automatic payment flow and records an
                        audit event. Use only after verifying the money was
                        actually received.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit}>
                    <DialogBody className="space-y-3">
                        <Field label="Reason (audited)" error={errors.reason}>
                            <TextField
                                value={data.reason}
                                onChange={(v) => setData("reason", v)}
                                // placeholder="e.g. cash received at counter, ref #123"
                            />
                        </Field>
                        {errors.action && (
                            <p className="text-destructive text-sm">
                                {errors.action}
                            </p>
                        )}
                    </DialogBody>
                    <DialogFooter className="gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={processing}
                        >
                            {processing ? "Saving…" : "Mark as paid"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* ---------------- Transition status ---------------- */

type TransitionForm = { status: string; action?: string };

export function TransitionModal({
    open,
    onClose,
    parcelId,
    currentStatus,
    statuses,
}: {
    open: boolean;
    onClose: () => void;
    parcelId: number;
    currentStatus: string;
    statuses: Record<string, string>;
}) {
    const {
        data,
        setData,
        post,
        processing,
        errors,
        setDefaults,
        clearErrors,
    } = useForm<TransitionForm>({ status: currentStatus });

    const submit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            post(route("admin.parcels.transition", parcelId), {
                preserveScroll: true,
                onSuccess: () => {
                    toastSuccess("Status updated.");
                    // Reset back to the *new* current status, not to `{}`,
                    // so reopening the modal starts sane.
                    setDefaults({ status: data.status });
                    clearErrors();
                    onClose();
                },
                onError: (e) =>
                    toastError(e.action ?? "Could not update status."),
            });
        },
        [parcelId, post, data.status, setDefaults, clearErrors, onClose],
    );

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Change status</DialogTitle>
                    <DialogDescription>
                        Moves the parcel to a new lifecycle status.
                        Payment-related statuses are only changed by
                        PaymentService.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit}>
                    <DialogBody className="space-y-3">
                        <Field label="New status" error={errors.status}>
                            <select
                                value={data.status}
                                onChange={(e) =>
                                    setData("status", e.target.value)
                                }
                                className="w-full rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-[.88rem]"
                            >
                                {Object.entries(statuses).map(([k, v]) => (
                                    <option key={k} value={k}>
                                        {v}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        {errors.action && (
                            <p className="text-destructive text-sm">
                                {errors.action}
                            </p>
                        )}
                    </DialogBody>
                    <DialogFooter className="gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? "Saving…" : "Update status"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// resources/js/components/admin/parcel-modals.tsx — add at the bottom

type CashCodForm = {
    amount_received: number | "";
    note: string;
    action?: string;
};

export function CashCodModal({
    open,
    onClose,
    parcelId,
    expectedAmount,
}: {
    open: boolean;
    onClose: () => void;
    parcelId: number;
    expectedAmount: number;
}) {
    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm<CashCodForm>({
            amount_received: expectedAmount,
            note: "",
        });

    const submit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            post(route("admin.parcels.cash-cod", parcelId), {
                preserveScroll: true,
                onSuccess: () => {
                    toastSuccess("Cash COD recorded.");
                    reset();
                    clearErrors();
                    onClose();
                },
                onError: (e) =>
                    toastError(e.action ?? "Could not record cash COD."),
            });
        },
        [parcelId, post, reset, clearErrors, onClose],
    );

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Record cash COD</DialogTitle>
                    <DialogDescription>
                        Confirm the recipient handed over cash. Expected:{" "}
                        <b>{money(expectedAmount)}</b>. This marks the COD
                        payment as successful and updates the parcel balance.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit}>
                    <DialogBody className="space-y-3">
                        <Field
                            label="Amount received (KSh)"
                            error={errors.amount_received}
                            required
                        >
                            <TextField
                                type="number"
                                value={data.amount_received}
                                onChange={(v) => setData("amount_received", v)}
                            />
                        </Field>
                        <Field label="Note (optional)" error={errors.note}>
                            <TextField
                                value={data.note}
                                onChange={(v) => setData("note", v)}
                                placeholder="e.g. cash handed at counter, no change given"
                            />
                        </Field>
                        {errors.action && (
                            <p className="text-destructive text-sm">
                                {errors.action}
                            </p>
                        )}
                    </DialogBody>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {processing ? "Saving…" : "Record cash"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
