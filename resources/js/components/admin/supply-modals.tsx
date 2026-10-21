// resources/js/components/admin/supply-modals.tsx
import { router } from "@inertiajs/react";
import React, { useState } from "react";
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
import { money } from "@/components/admin/money";
import { toastError, toastSuccess } from "@/lib/toast";

const inputClass =
    "w-full rounded-lg border border-sidebar-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ps-brand/40";

/* ============================================================
 | Record a manual (cash / wallet) payment
 * ============================================================ */

export function RecordSupplyPaymentModal({
    open,
    onClose,
    supplyId,
    balanceDue,
}: {
    open: boolean;
    onClose: () => void;
    supplyId: number;
    balanceDue: number;
}) {
    const [amount, setAmount] = useState(balanceDue.toString());
    const [channel, setChannel] = useState<"cash" | "wallet" | "manual">(
        "cash",
    );
    const [reference, setReference] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = Number(amount);
        if (!Number.isInteger(num) || num < 1 || num > balanceDue) {
            toastError(`Enter an amount between 1 and ${money(balanceDue)}`);
            return;
        }
        setBusy(true);
        router.patch(
            route("admin.supply-requests.record-payment", supplyId),
            { amount: num, channel, reference: reference || null },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toastSuccess("Payment recorded");
                    onClose();
                },
                onError: () => toastError("Failed to record payment"),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record payment</DialogTitle>
                    <DialogDescription>
                        Record cash or wallet payment. Outstanding:{" "}
                        <b>{money(balanceDue)}</b>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit}>
                    <DialogBody className="space-y-3">
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Amount (KES)
                            </span>
                            <input
                                type="number"
                                min="1"
                                max={balanceDue}
                                step="1"
                                className={inputClass}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                autoFocus
                                required
                            />
                        </label>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Channel
                            </span>
                            <select
                                className={inputClass}
                                value={channel}
                                onChange={(e) =>
                                    setChannel(e.target.value as typeof channel)
                                }
                            >
                                <option value="cash">Cash</option>
                                <option value="wallet">Wallet</option>
                                <option value="manual">Manual</option>
                            </select>
                        </label>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Reference (optional)
                            </span>
                            <input
                                className={inputClass}
                                value={reference}
                                onChange={(e) => setReference(e.target.value)}
                                placeholder="e.g. receipt no."
                            />
                        </label>
                    </DialogBody>
                    <DialogFooter className="gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={busy}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={busy}>
                            {busy ? "Recording…" : "Record payment"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* ============================================================
 | Initiate STK push
 * ============================================================ */

export function SupplyStkModal({
    open,
    onClose,
    supplyId,
    balanceDue,
    defaultPhone,
}: {
    open: boolean;
    onClose: () => void;
    supplyId: number;
    balanceDue: number;
    defaultPhone: string;
}) {
    const [amount, setAmount] = useState(balanceDue.toString());
    const [phone, setPhone] = useState(defaultPhone);
    const [busy, setBusy] = useState(false);

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const num = Number(amount);
        if (!Number.isInteger(num) || num < 1 || num > balanceDue) {
            toastError(`Enter an amount between 1 and ${money(balanceDue)}`);
            return;
        }
        setBusy(true);
        router.post(
            route("admin.supply-requests.initiate-stk", supplyId),
            { amount: num, phone },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toastSuccess("STK prompt sent");
                    onClose();
                },
                onError: () => toastError("Failed to initiate STK"),
                onFinish: () => setBusy(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send M-PESA prompt</DialogTitle>
                    <DialogDescription>
                        Ask the customer to pay. Outstanding:{" "}
                        <b>{money(balanceDue)}</b>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit}>
                    <DialogBody className="space-y-3">
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Phone
                            </span>
                            <input
                                type="tel"
                                className={inputClass}
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="07XX XXX XXX"
                                autoFocus
                                required
                            />
                        </label>
                        <label className="block space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Amount (KES)
                            </span>
                            <input
                                type="number"
                                min="1"
                                max={balanceDue}
                                step="1"
                                className={inputClass}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </label>
                        <p className="text-xs text-muted-foreground">
                            The customer must enter their M-PESA PIN to
                            complete. This page will not update automatically —
                            refresh to see the updated status.
                        </p>
                    </DialogBody>
                    <DialogFooter className="gap-2 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={busy}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={busy}>
                            {busy ? "Sending…" : "Send prompt"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
