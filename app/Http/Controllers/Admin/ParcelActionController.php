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
     |  RETRY STK
     * =================================================================*/

    public function retryStk(Request $request, Parcel $parcel): RedirectResponse
    {
        $request->validate([
            'payment_id' => ['required', 'integer', 'exists:payments,id'],
        ]);

        /** @var Payment $payment */
        $payment = $parcel->payments()->findOrFail($request->integer('payment_id'));

        if ($payment->type !== 'delivery' || $payment->status !== 'pending') {
            return back()->withErrors([
                'action' => 'Only pending delivery payments can be retried.',
            ]);
        }

        $mobile = $payment->payer_phone
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
     |  MANUAL M-PESA CLAIM
     * =================================================================*/

    public function claim(Request $request, Parcel $parcel): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'min:6', 'max:20', 'regex:/^[A-Z0-9]+$/i'],
        ]);

        try {
            $this->payments->recordMpesaCodeClaim($parcel, $data['code']);

            // Acknowledge receipt only — reconciliation happens later.
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
     |  MANUAL MARK-PAID OVERRIDE
     * =================================================================*/

    public function markPaid(Request $request, Parcel $parcel): RedirectResponse
    {
        $data = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:255'],
        ]);

        if ((int) $parcel->total <= 0) {
            return back()->withErrors(['action' => 'Parcel has no total; cannot mark paid.']);
        }

        DB::transaction(function () use ($parcel, $data) {
            $paid = (int) Payment::query()
                ->where('parcel_id', $parcel->id)
                ->where('status', 'success')
                ->whereIn('type', ['delivery', 'cod'])
                ->sum('amount');

            $parcel->forceFill([
                'amount_paid' => max($paid, (int) $parcel->total),
                'paid_at' => now(),
                'status' => Parcel::STATUS_PAID,
            ])->save();

            $parcel->events()->create([
                'status' => 'admin_override',
                'label' => 'Marked paid manually',
                'description' => $data['reason'],
                'happened_at' => now(),
                'staff_id' => auth()->id(),
            ]);
        });

        // Override flow — no real M-PESA reference, so use the neutral message.
        $this->notifications->parcelMarkedPaidByAdmin($parcel->fresh());

        return back()->with('success', 'Parcel marked as paid.');
    }

    /* =================================================================
     |  STATUS TRANSITION
     * =================================================================*/

    public function transition(Request $request, Parcel $parcel): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', 'string'],
            'force' => ['sometimes', 'boolean'], // super-admin override
        ]);

        $previousStatus = $parcel->status;

        try {
            // Transition map now enforced by the model. Pass force to bypass.
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

        // Only notify if the status actually changed.
        if ($previousStatus !== $data['status']) {
            $this->notifications->parcelStatusChanged($parcel->fresh(), $data['status']);
        }

        return back()->with('success', 'Status updated.');
    }

    /* =================================================================
     |  LINK M-PESA TRANSACTION
     * =================================================================*/

    public function linkTx(Request $request, Parcel $parcel, Payment $payment): RedirectResponse
    {
        $data = $request->validate([
            'mpesa_transaction_id' => ['required', 'integer', 'exists:mpesa_transactions,id'],
        ]);

        if ($payment->parcel_id !== $parcel->id) {
            abort(404);
        }

        /** @var MpesaTransaction $tx */
        $tx = MpesaTransaction::findOrFail($data['mpesa_transaction_id']);

        if ($tx->payment_id !== null && $tx->payment_id !== $payment->id) {
            return back()->withErrors(['action' => 'Transaction already linked to another payment.']);
        }

        $tx->update(['payment_id' => $payment->id]);

        $parcel->events()->create([
            'status' => 'admin_link',
            'label' => 'M-PESA transaction linked',
            'description' => "Linked {$tx->mpesa_receipt_number} to payment #{$payment->id}",
            'happened_at' => now(),
            'staff_id' => auth()->id(),
        ]);

        // No SMS — reconciliation is internal. If linking flips the payment
        // to success, the lifecycle SMS should fire from PaymentService's
        // callback/observer, not here, to avoid double-sends.

        return back()->with('success', 'M-PESA transaction linked.');
    }

    /* =================================================================
     |  CASH COD
     * =================================================================*/

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

            // Fresh parcel so balanceDue() reflects the new payment row.
            $this->notifications->parcelCashReceived($parcel->fresh(), (int) $payment->amount);

            return back()->with(
                'success',
                'Cash COD recorded: KSh ' . number_format((int) $payment->amount),
            );
        } catch (\DomainException $e) {
            return back()->withErrors(['action' => $e->getMessage()]);
        }
    }
}