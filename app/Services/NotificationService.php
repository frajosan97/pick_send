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

    public function notify(string $mobile, string $smsBody): void
    {
        $this->safe(fn() => $this->sms->sendSms($mobile, $smsBody), 'sms', $mobile);
    }

    /* =================================================================
     |  PARCEL LIFECYCLE
     * =================================================================*/

    public function parcelBooked(Parcel $parcel): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;

        // Three possible bodies depending on payment_option.
        $paymentLine = match ($parcel->payment_option) {
            Parcel::PAYMENT_PREPAID => "Pay KES {$parcel->amount_due_now} by M-PESA to complete the booking.",
            Parcel::PAYMENT_COD_FEE => "Pay KES {$parcel->amount_due_now} delivery fee by M-PESA. "
                . "Recipient pays KES {$parcel->cod_amount} for goods on delivery.",
            Parcel::PAYMENT_COD_FULL => "No payment now. Recipient pays KES {$parcel->total} on delivery.",
            default => "Total: KES {$parcel->total}.",
        };

        $smsBody = "Your parcel {$parcel->tracking_no} has been booked. {$paymentLine} "
            . "Handover code: {$parcel->handover_code}.";

        $this->notify($mobile, $smsBody);
    }

    public function parcelPaid(Parcel $parcel, string $mpesaCode): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;

        // If the COD portion is still outstanding, do not say "paid in full".
        $fullyPaid = $parcel->isPaid();
        $body = $fullyPaid
            ? "Payment received in full for parcel {$parcel->tracking_no}. M-PESA: {$mpesaCode}. Thank you!"
            : "Delivery payment received for parcel {$parcel->tracking_no}. "
            . "The recipient will pay KES {$parcel->balanceDue()} on delivery. M-PESA: {$mpesaCode}.";

        $this->notify($mobile, $body);
    }

    public function parcelInTransit(Parcel $parcel): void
    {
        $mobile = $parcel->recipient_phone ?? $parcel->sender_phone;
        $smsBody = "Parcel {$parcel->tracking_no} is now in transit. "
            . 'Track: ' . route('parcels.show', $parcel->tracking_no);

        $this->notify($mobile, $smsBody);
    }

    public function parcelDelivered(Parcel $parcel): void
    {
        $mobile = $parcel->recipient_phone ?? $parcel->sender_phone;
        $smsBody = "Parcel {$parcel->tracking_no} has been delivered. "
            . "Handover code: {$parcel->handover_code}.";

        $this->notify($mobile, $smsBody);
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