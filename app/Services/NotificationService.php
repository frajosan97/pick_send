<?php

namespace App\Services;

use App\Models\Parcel;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    // use Queueable;

    public function __construct(
        protected SmsService $sms,
        protected WhatsAppService $whatsapp,
    ) {
    }

    /**
     * Fan-out a message to both channels.
     */
    public function notify(string $mobile, string $message, ?string $template = null, array $templateParams = []): void
    {
        $this->safe(fn() => $this->sms->sendSms($mobile, $message), 'sms', $mobile);
        $this->safe(
            fn() => $template
                ? $this->whatsapp->sendTemplate($mobile, $template, $templateParams)
                : $this->whatsapp->sendText($mobile, $message),
            'whatsapp',
            $mobile
        );
    }

    // -------- Parcel-specific notifications --------

    public function parcelBooked(Parcel $parcel): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;
        $message = "Your parcel {$parcel->tracking_no} has been booked. "
            . "Total: KES {$parcel->total}. "
            . "Handover code: {$parcel->handover_code}. "
            . "Track: " . route('parcels.show', $parcel->tracking_no);

        $this->notify($mobile, $message, 'parcel_booked', [
            $parcel->tracking_no,
            number_format((float) $parcel->total, 2),
            $parcel->handover_code,
        ]);
    }

    public function parcelPaid(Parcel $parcel, string $mpesaCode): void
    {
        $mobile = $parcel->sender_phone ?? $parcel->recipient_phone;
        $message = "Payment received for parcel {$parcel->tracking_no}. "
            . "M-PESA: {$mpesaCode}. Thank you!";

        $this->notify($mobile, $message, 'parcel_paid', [
            $parcel->tracking_no,
            $mpesaCode,
            number_format((float) $parcel->total, 2),
        ]);
    }

    public function parcelInTransit(Parcel $parcel): void
    {
        $mobile = $parcel->recipient_phone ?? $parcel->sender_phone;
        $message = "Parcel {$parcel->tracking_no} is now in transit. "
            . "Track: " . route('parcels.show', $parcel->tracking_no);

        $this->notify($mobile, $message, 'parcel_in_transit', [$parcel->tracking_no]);
    }

    public function parcelDelivered(Parcel $parcel): void
    {
        $mobile = $parcel->recipient_phone ?? $parcel->sender_phone;
        $message = "Parcel {$parcel->tracking_no} has been delivered. "
            . "Handover code: {$parcel->handover_code}.";

        $this->notify($mobile, $message, 'parcel_delivered', [
            $parcel->tracking_no,
            $parcel->handover_code,
        ]);
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