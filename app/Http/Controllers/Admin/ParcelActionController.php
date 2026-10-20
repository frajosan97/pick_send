<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MpesaTransaction;
use App\Models\Parcel;
use App\Models\Payment;
use App\Services\NotificationService;
use App\Services\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ParcelActionController extends Controller
{
    public function __construct(
        private PaymentService $payments,
        private NotificationService $notifications,
    ) {
    }

    /* =================================================================
     | RETRY STK
     | ================================================================= */

    public function retryStk(Request $request, Parcel $parcel): RedirectResponse
    {
        $request->validate([
            'payment_id' => ['required', 'integer', 'exists:payments,id'],
        ]);

        /** @var Payment $payment */
        $payment = $parcel->payments()->findOrFail($request->integer('payment_id'));

        if (
            $payment->type !== Payment::TYPE_DELIVERY
            || $payment->status !== Payment::STATUS_PENDING
        ) {
            return back()->withErrors([
                'action' => 'Only pending delivery payments can be retried.',
            ]);
        }

        if ($payment->mpesaTransaction()->where('status', 'pending')->exists()) {
            return back()->withErrors([
                'action' => 'An M-PESA prompt is already in flight for this payment.',
            ]);
        }

        $mobile = $payment->phone
            ?? $parcel->sender_phone
            ?? $parcel->recipient_phone;

        try {
            $result = $this->payments->retryStkFor($parcel, $payment);

            if (!empty($result['error'])) {
                if ($mobile) {
                    $this->notifications->paymentInitFailed($mobile, $parcel);
                }
                return back()->withErrors(['action' => $result['error']]);
            }

            if ($mobile) {
                $this->notifications->paymentPromptSent($mobile, $parcel);
            }

            return back()->with('success', 'STK prompt re-sent to the customer.');
        } catch (\Throwable $e) {
            Log::error('Admin retry STK failed', [
                'parcel' => $parcel->id,
                'error' => $e->getMessage(),
            ]);
            if ($mobile) {
                $this->notifications->paymentInitFailed($mobile, $parcel);
            }
            return back()->withErrors(['action' => 'Could not re-send the STK prompt.']);
        }
    }

    /* =================================================================
     | MANUAL M-PESA CLAIM
     | ================================================================= */

    public function claim(Request $request, Parcel $parcel): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'min:6', 'max:20', 'regex:/^[A-Z0-9]+$/i'],
        ]);

        try {
            $this->payments->recordMpesaCodeClaim($parcel, $data['code']);
            $this->notifications->parcelPaymentVerifying($parcel, $data['code']);

            return back()->with('success', "M-PESA code {$data['code']} attached — pending reconciliation.");
        } catch (\Throwable $e) {
            Log::error('Admin claim failed', [
                'parcel' => $parcel->id,
                'error' => $e->getMessage(),
            ]);
            return back()->withErrors(['action' => 'Could not record the M-PESA code.']);
        }
    }

    /* =================================================================
     | MANUAL MARK-PAID OVERRIDE
     | ================================================================= */

    /**
     * Mark a parcel paid. Since parcels.amount_paid is derived from
     * successful payments, the only legitimate way to "mark paid" is to
     * record a settlement payment for the outstanding balance.
     */
    public function markPaid(Request $request, Parcel $parcel): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:255'],
        ]);

        if ((int) $parcel->total <= 0) {
            return back()->withErrors(['action' => 'Parcel has no total; cannot mark paid.']);
        }

        $parcel->refresh();
        $outstanding = (int) $parcel->balanceDue();
        if ($outstanding <= 0) {
            return back()->with('success', 'Parcel is already paid.');
        }

        DB::transaction(function () use ($parcel, $outstanding, $data) {
            // Record the gap as a manual settlement payment.
            $payment = Payment::create([
                'parcel_id' => $parcel->id,
                'user_id' => $parcel->sender_id,
                'type' => $parcel->payment_option === Parcel::PAYMENT_COD_FULL
                    ? Payment::TYPE_COD
                    : Payment::TYPE_DELIVERY,
                'status' => Payment::STATUS_SUCCESS,
                'amount' => $outstanding,
                'channel' => Payment::CHANNEL_MANUAL,
                'phone' => formatPhoneNumber(
                    (string) ($parcel->recipient_phone ?: $parcel->sender_phone)
                ),
                'reference' => $parcel->tracking_no,
                'confirmed_at' => now(),
            ]);

            $parcel->events()->create([
                'status' => 'admin_override',
                'label' => 'Marked paid manually',
                'description' => $data['reason']
                    . ' — KSh ' . number_format($outstanding) . ' recorded',
                'happened_at' => now(),
                'staff_id' => auth()->id(),
            ]);
        });

        // Recompute from the payments table (source of truth).
        $this->payments->recalculateParcel($parcel->fresh());

        $this->notifications->parcelMarkedPaidByAdmin($parcel->fresh());

        return back()->with('success', 'Parcel marked as paid.');
    }

    /* =================================================================
     | STATUS TRANSITION
     | ================================================================= */

    public function transition(Request $request, Parcel $parcel): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string'],
            'force' => ['sometimes', 'boolean'],
        ]);

        $previousStatus = $parcel->status;

        try {
            $parcel->transitionTo($data['status'], force: (bool) ($data['force'] ?? false));

            $parcel->events()->create([
                'status' => $data['status'],
                'label' => 'Status changed by admin',
                'description' => isset($data['force']) && $data['force']
                    ? "Forced move {$previousStatus} → {$data['status']}"
                    : "Moved to {$data['status']}",
                'happened_at' => now(),
                'staff_id' => auth()->id(),
            ]);
        } catch (\InvalidArgumentException $e) {
            return back()->withErrors(['action' => $e->getMessage()]);
        }

        if ($previousStatus !== $data['status']) {
            $this->notifications->parcelStatusChanged($parcel->fresh(), $data['status']);
        }

        return back()->with('success', 'Status updated.');
    }

    /* =================================================================
     | LINK / RECONCILE ORPHAN M-PESA TRANSACTION
     | ================================================================= */

    public function linkTx(Request $request, Parcel $parcel): RedirectResponse
    {
        $data = $request->validate([
            'mpesa_transaction_id' => ['required', 'integer', 'exists:mpesa_transactions,id'],
        ]);

        /** @var MpesaTransaction $tx */
        $tx = MpesaTransaction::findOrFail($data['mpesa_transaction_id']);

        if ($tx->payment_id !== null) {
            return back()->withErrors(['action' => 'Transaction is already linked.']);
        }

        try {
            $this->payments->reconcileOrphan($tx, $parcel);

            $parcel->events()->create([
                'status' => 'admin_link',
                'label' => 'M-PESA transaction reconciled',
                'description' => "Linked {$tx->mpesa_receipt_number} to parcel {$parcel->tracking_no}",
                'happened_at' => now(),
                'staff_id' => auth()->id(),
            ]);

            return back()->with('success', 'M-PESA transaction reconciled.');
        } catch (\DomainException $e) {
            return back()->withErrors(['action' => $e->getMessage()]);
        }
    }

    /* =================================================================
     | CASH COD
     | ================================================================= */

    public function cashCod(Request $request, Parcel $parcel): RedirectResponse
    {
        $data = $request->validate([
            'amount_received' => ['required', 'integer', 'min:1'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $payment = $this->payments->recordCashCod(
                parcel: $parcel,
                amountReceived: (int) $data['amount_received'],
                staffId: (int) auth()->id(),
                note: $data['note'] ?? null,
            );

            $this->notifications->parcelCashReceived(
                $parcel->fresh(),
                (int) $payment->amount,
            );

            return back()->with(
                'success',
                'Cash COD recorded: KSh ' . number_format((int) $payment->amount),
            );
        } catch (\DomainException $e) {
            return back()->withErrors(['action' => $e->getMessage()]);
        }
    }
}