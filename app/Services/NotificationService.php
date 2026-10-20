<?php

namespace App\Services;

use App\Models\Parcel;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function __construct(
        protected SmsService $sms,
    ) {
    }

    public function notify(?string $mobile, string $smsBody): void
    {
        if (!$mobile) {
            Log::warning('Notification skipped: no mobile number', ['body' => $smsBody]);
            return;
        }

        $this->safe(fn() => $this->sms->sendSms($mobile, $smsBody), 'sms', $mobile);
    }

    /* =================================================================
     |  PARCEL LIFECYCLE
     * =================================================================*/

    public function parcelBooked(Parcel $parcel): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;

        $paymentLine = match ($parcel->payment_option) {
            Parcel::PAYMENT_PREPAID => "Pay KES {$parcel->amount_due_now} by M-PESA to complete the booking.",
            Parcel::PAYMENT_COD_FEE => "Pay KES {$parcel->amount_due_now} delivery fee by M-PESA. "
                . "Recipient pays KES {$parcel->cod_amount} for goods on delivery.",
            Parcel::PAYMENT_COD_FULL => "No payment now. Recipient pays KES {$parcel->total} on delivery.",
            default => "Total: KES {$parcel->total}.",
        };

        $this->notify(
            $mobile,
            "Your parcel {$parcel->tracking_no} has been booked. {$paymentLine} "
            . "Handover code: {$parcel->handover_code}."
        );
    }

    /**
     * Confirmed payment. $reference is the M-PESA receipt, cash ref, etc.
     * $method is 'M-PESA', 'Cash', ...
     */
    public function parcelPaid(Parcel $parcel, string $reference, string $method = 'M-PESA'): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;

        $body = $parcel->isPaid()
            ? "Payment received in full for parcel {$parcel->tracking_no}. {$method}: {$reference}. Thank you!"
            : "Delivery payment received for parcel {$parcel->tracking_no}. "
            . "The recipient will pay KES {$parcel->balanceDue()} on delivery. {$method}: {$reference}.";

        $this->notify($mobile, $body);
    }

    public function parcelMarkedPaidByAdmin(Parcel $parcel): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;

        $this->notify(
            $mobile,
            "Payment for parcel {$parcel->tracking_no} has been confirmed by our team. "
            . "You will be notified as it moves forward. Thank you."
        );
    }

    public function parcelPaymentVerifying(Parcel $parcel, string $reference): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;

        $this->notify(
            $mobile,
            "We received M-PESA code {$reference} for parcel {$parcel->tracking_no}. "
            . "It is being verified and you will be notified once confirmed."
        );
    }

    public function parcelCashReceived(Parcel $parcel, int $amountReceived): void
    {
        $mobile = $parcel->recipient_phone ?? $parcel->sender_phone;
        $balance = $parcel->balanceDue();

        $body = $balance > 0
            ? "Cash payment of KES {$amountReceived} received for parcel {$parcel->tracking_no}. "
            . "Remaining balance: KES {$balance}."
            : "Cash payment of KES {$amountReceived} received in full for parcel {$parcel->tracking_no}. Thank you!";

        $this->notify($mobile, $body);
    }

    public function parcelInTransit(Parcel $parcel): void
    {
        $mobile = $parcel->recipient_phone ?? $parcel->sender_phone;

        $this->notify(
            $mobile,
            "Parcel {$parcel->tracking_no} is now in transit. "
            . 'Track: ' . route('parcels.show', $parcel->tracking_no)
        );
    }

    public function parcelAtPickup(Parcel $parcel): void
    {
        $mobile = $parcel->recipient_phone ?? $parcel->sender_phone;

        $this->notify(
            $mobile,
            "Parcel {$parcel->tracking_no} is ready for collection. "
            . "Bring handover code {$parcel->handover_code}."
        );
    }

    /**
     * Terminal success state. STATUS_DELIVERED is an alias for STATUS_COLLECTED.
     */
    public function parcelDelivered(Parcel $parcel): void
    {
        $mobile = $parcel->recipient_phone ?? $parcel->sender_phone;

        $this->notify(
            $mobile,
            "Parcel {$parcel->tracking_no} has been delivered. "
            . "Handover code: {$parcel->handover_code}."
        );
    }

    public function parcelReturned(Parcel $parcel): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;

        $this->notify(
            $mobile,
            "Parcel {$parcel->tracking_no} is being returned. "
            . "Please contact support for details."
        );
    }

    public function parcelCancelled(Parcel $parcel): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;

        $this->notify(
            $mobile,
            "Parcel {$parcel->tracking_no} has been cancelled. "
            . "If a payment was made, a refund will be processed."
        );
    }

    /**
     * Dispatch a lifecycle SMS based on a target status.
     * Returns true if a notification was sent.
     */
    public function parcelStatusChanged(Parcel $parcel, string $status): bool
    {
        return match ($status) {
            Parcel::STATUS_IN_TRANSIT => tap(true, fn() => $this->parcelInTransit($parcel)),
            Parcel::STATUS_AT_PICKUP => tap(true, fn() => $this->parcelAtPickup($parcel)),
            Parcel::STATUS_DELIVERED => tap(true, fn() => $this->parcelDelivered($parcel)),
            Parcel::STATUS_RETURNED => tap(true, fn() => $this->parcelReturned($parcel)),
            Parcel::STATUS_CANCELLED => tap(true, fn() => $this->parcelCancelled($parcel)),
                // Admin-set 'paid' has no real reference — use override message.
            Parcel::STATUS_PAID => tap(true, fn() => $this->parcelMarkedPaidByAdmin($parcel)),
            default => false,
        };
    }

    /* =================================================================
     |  PAYMENT PROMPTS / FAILURES
     * =================================================================*/

    public function paymentPromptSent(string $mobile, Parcel $parcel): void
    {
        $this->notify(
            $mobile,
            "An M-PESA prompt for KES {$parcel->amount_due_now} has been sent to your phone "
            . "for parcel {$parcel->tracking_no}. Enter your PIN to complete payment."
        );
    }

    public function paymentInitFailed(string $mobile, Parcel $parcel): void
    {
        $this->notify(
            $mobile,
            "We couldn't initiate the M-PESA prompt for parcel {$parcel->tracking_no}. "
            . "Please pay manually using the instructions on the page, or contact support."
        );
    }

    public function paymentFailed(string $mobile, Parcel $parcel, string $reason): void
    {
        $this->notify(
            $mobile,
            "Payment for parcel {$parcel->tracking_no} was not completed. "
            . "Reason: {$reason}. Please try again."
        );
    }

    protected function safe(callable $fn, string $channel, string $mobile): void
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            Log::warning("Notification failed on {$channel}", [
                'mobile' => $mobile,
                'error' => $e->getMessage(),
            ]);
        }
    }
}