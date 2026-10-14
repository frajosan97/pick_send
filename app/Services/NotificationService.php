<?php

namespace App\Services;

use App\Models\Parcel;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Reuse the template already approved in your WABA.
     * If you later create dedicated templates (parcel_booked, parcel_paid, etc.)
     * under en_US and get them APPROVED, just swap the constants below.
     */
    protected const TEMPLATE_BOOKED = 'jaspers_market_order_confirmation_v1';
    protected const TEMPLATE_LANG = 'en_US';

    public function __construct(
        protected SmsService $sms,
        protected WhatsAppService $whatsapp,
    ) {
    }

    /**
     * Fan-out a message to both channels.
     *
     * @param string      $mobile        Recipient number.
     * @param string      $smsBody       Plain text used for SMS AND as fallback WhatsApp text.
     * @param string|null $template      Approved WhatsApp template name (optional).
     * @param array       $templateParams Positional body params in {{1}}, {{2}}, {{3}} order.
     * @param string      $templateLang  Must match the approved locale exactly.
     */
    public function notify(
        string $mobile,
        string $smsBody,
        ?string $template = null,
        array $templateParams = [],
        string $templateLang = self::TEMPLATE_LANG
    ): void {
        $this->safe(fn() => $this->sms->sendSms($mobile, $smsBody), 'sms', $mobile);

        $this->safe(
            fn() => $template
                ? $this->whatsapp->sendTemplate($mobile, $template, $templateParams, $templateLang)
                : $this->whatsapp->sendText($mobile, $smsBody),
            'whatsapp',
            $mobile
        );
    }

    // ---------- Parcel-specific helpers ----------

    public function parcelBooked(Parcel $parcel): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;

        $smsBody = "Your parcel {$parcel->tracking_no} has been booked. "
            . "Total: KES {$parcel->total}. "
            . "Handover code: {$parcel->handover_code}.";

        // Template jaspers_market_order_confirmation_v1 uses 3 body params:
        // {{1}} customer name, {{2}} reference, {{3}} date
        $this->notify(
            $mobile,
            $smsBody,
            self::TEMPLATE_BOOKED,
            [
                $parcel->sender_name ?? 'Customer',
                $parcel->tracking_no,
                now()->format('M d, Y'),
            ],
            self::TEMPLATE_LANG
        );
    }

    public function parcelPaid(Parcel $parcel, string $mpesaCode): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;

        $smsBody = "Payment received for parcel {$parcel->tracking_no}. "
            . "M-PESA: {$mpesaCode}. Thank you!";

        $this->notify(
            $mobile,
            $smsBody,
            self::TEMPLATE_BOOKED,
            [
                $parcel->sender_name ?? 'Customer',
                $parcel->tracking_no,
                now()->format('M d, Y'),
            ],
            self::TEMPLATE_LANG
        );
    }

    public function parcelInTransit(Parcel $parcel): void
    {
        $mobile = $parcel->recipient_phone ?? $parcel->sender_phone;
        $smsBody = "Parcel {$parcel->tracking_no} is now in transit. "
            . "Track: " . route('parcels.show', $parcel->tracking_no);

        $this->notify($mobile, $smsBody); // SMS only until a transit template exists
    }

    public function parcelDelivered(Parcel $parcel): void
    {
        $mobile = $parcel->recipient_phone ?? $parcel->sender_phone;
        $smsBody = "Parcel {$parcel->tracking_no} has been delivered. "
            . "Handover code: {$parcel->handover_code}.";

        $this->notify($mobile, $smsBody); // SMS only until a delivery template exists
    }

    /**
     * Payment initiation / failure notices — SMS only unless you create dedicated templates.
     */
    public function paymentPromptSent(string $mobile, Parcel $parcel): void
    {
        $this->notify(
            $mobile,
            "An M-PESA prompt for KES {$parcel->delivery_fee} has been sent to your phone "
            . "for parcel {$parcel->tracking_no}. Enter your PIN to complete payment."
        );
    }

    public function paymentInitFailed(string $mobile, Parcel $parcel): void
    {
        $this->notify(
            $mobile,
            "We couldn't initiate payment for parcel {$parcel->tracking_no}. "
            . "Please try again or contact support."
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