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

    /* =================================================================
     | CORE
     | ================================================================= */

    public function notify(?string $mobile, string $smsBody): void
    {
        if (!$mobile) {
            Log::warning('Notification skipped: no mobile number', ['body' => $smsBody]);
            return;
        }

        $this->safe(fn() => $this->sms->sendSms($mobile, $smsBody), 'sms', $mobile);
    }

    /**
     * Pick the phone most relevant to the current event.
     *
     *   'sender'    — booking, cancellation, return, admin override
     *   'recipient' — in transit, at pickup, delivered, cash received
     *
     * Falls back to the other party so an SMS is never silently dropped.
     */
    private function mobileFor(Parcel $parcel, string $prefer = 'recipient'): ?string
    {
        return $prefer === 'sender'
            ? ($parcel->sender_phone ?? $parcel->recipient_phone)
            : ($parcel->recipient_phone ?? $parcel->sender_phone);
    }

    /* =================================================================
     | PARCEL LIFECYCLE
     | ================================================================= */

    public function parcelBooked(Parcel $parcel): void
    {
        $paymentLine = match ($parcel->payment_option) {
            Parcel::PAYMENT_PREPAID => "Pay KES {$parcel->amount_due_now} by M-PESA to complete the booking.",
            Parcel::PAYMENT_COD_FEE => "Pay KES {$parcel->amount_due_now} delivery fee by M-PESA. "
                . "Recipient pays KES {$parcel->cod_amount} for goods on delivery.",
            Parcel::PAYMENT_COD_FULL => "No payment now. Recipient pays KES {$parcel->total} on delivery.",
            default => "Total: KES {$parcel->total}.",
        };

        $this->notify(
            $this->mobileFor($parcel, 'sender'),
            "Your parcel {$parcel->tracking_no} has been booked. {$paymentLine} "
            . "Handover code: {$parcel->handover_code}."
        );
    }

    /**
     * Confirmed payment. $reference is the M-PESA receipt, cash ref, etc.
     * $method is 'M-PESA', 'Cash', ...
     *
     * $reference may be empty when the payment channel doesn't produce a
     * receipt (e.g. admin override). The message degrades gracefully.
     */
    public function parcelPaid(Parcel $parcel, string $reference = '', string $method = 'M-PESA'): void
    {
        $tail = $reference !== ''
            ? " {$method}: {$reference}."
            : '';

        $body = $parcel->isPaid()
            ? "Payment received in full for parcel {$parcel->tracking_no}.{$tail} Thank you!"
            : "Delivery payment received for parcel {$parcel->tracking_no}. "
            . "The recipient will pay KES {$parcel->balanceDue()} on delivery.{$tail}";

        $this->notify($this->mobileFor($parcel, 'sender'), $body);
    }

    public function parcelMarkedPaidByAdmin(Parcel $parcel): void
    {
        $this->notify(
            $this->mobileFor($parcel, 'sender'),
            "Payment for parcel {$parcel->tracking_no} has been confirmed by our team. "
            . "You will be notified as it moves forward. Thank you."
        );
    }

    public function parcelPaymentVerifying(Parcel $parcel, string $reference): void
    {
        $this->notify(
            $this->mobileFor($parcel, 'sender'),
            "We received M-PESA code {$reference} for parcel {$parcel->tracking_no}. "
            . "It is being verified and you will be notified once confirmed."
        );
    }

    /**
     * $amountReceived is the amount APPLIED to the parcel (may be less
     * than what the customer handed over if the balance was smaller).
     */
    public function parcelCashReceived(Parcel $parcel, int $amountReceived): void
    {
        $balance = $parcel->balanceDue();

        $body = $balance > 0
            ? "Cash payment of KES {$amountReceived} received for parcel {$parcel->tracking_no}. "
            . "Remaining balance: KES {$balance}."
            : "Cash payment of KES {$amountReceived} received in full for parcel {$parcel->tracking_no}. Thank you!";

        $this->notify($this->mobileFor($parcel, 'recipient'), $body);
    }

    public function parcelInTransit(Parcel $parcel): void
    {
        $this->notify(
            $this->mobileFor($parcel, 'recipient'),
            "Parcel {$parcel->tracking_no} is now in transit. "
            . 'Track: ' . route('parcels.show', $parcel->tracking_no)
        );
    }

    public function parcelAtPickup(Parcel $parcel): void
    {
        $this->notify(
            $this->mobileFor($parcel, 'recipient'),
            "Parcel {$parcel->tracking_no} is ready for collection. "
            . "Bring handover code {$parcel->handover_code}."
        );
    }

    /**
     * Terminal success state. Note: the schema uses STATUS_COLLECTED for
     * "parcel has been picked up by the recipient". There is no
     * STATUS_DELIVERED constant.
     */
    public function parcelCollected(Parcel $parcel): void
    {
        $this->notify(
            $this->mobileFor($parcel, 'recipient'),
            "Parcel {$parcel->tracking_no} has been collected. "
            . "Thank you for using Pick & Send."
        );
    }

    public function parcelReturned(Parcel $parcel): void
    {
        $this->notify(
            $this->mobileFor($parcel, 'sender'),
            "Parcel {$parcel->tracking_no} is being returned. "
            . "Please contact support for details."
        );
    }

    public function parcelCancelled(Parcel $parcel): void
    {
        $this->notify(
            $this->mobileFor($parcel, 'sender'),
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
            Parcel::STATUS_IN_TRANSIT => $this->tapTrue(fn() => $this->parcelInTransit($parcel)),
            Parcel::STATUS_AT_PICKUP => $this->tapTrue(fn() => $this->parcelAtPickup($parcel)),
            Parcel::STATUS_COLLECTED => $this->tapTrue(fn() => $this->parcelCollected($parcel)),
            Parcel::STATUS_RETURNED => $this->tapTrue(fn() => $this->parcelReturned($parcel)),
            Parcel::STATUS_CANCELLED => $this->tapTrue(fn() => $this->parcelCancelled($parcel)),
            Parcel::STATUS_PAID => $this->tapTrue(fn() => $this->parcelMarkedPaidByAdmin($parcel)),
            default => false,
        };
    }

    /* =================================================================
     | PAYMENT PROMPTS / FAILURES
     | ================================================================= */

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

    /* =================================================================
 | ACCOUNTS
 | ================================================================= */

    /**
     * Sent once when an admin creates an account. Carries the initial
     * password. The password is NOT logged — only the mobile is.
     */
    public function userCreated(string $mobile, string $name, string $password, string $role): void
    {
        $this->notify(
            $mobile,
            "Welcome {$name}! Your {$role} account has been created. "
            . "Login with this phone number (or your email) and password: {$password}. "
            . "Please change your password after your first login."
        );
    }

    /**
     * Fallback when no phone is on file — email the credentials instead,
     * or surface this to the admin. We log so the admin can copy the
     * password from the log if SMS is impossible.
     */
    public function userCreatedNoPhone(string $name, string $email, string $password, string $role): void
    {
        Log::info('User created without phone — credentials must be delivered manually', [
            'name' => $name,
            'email' => $email,
            'role' => $role,
            // deliberately NOT logging $password
        ]);
    }

    /* =================================================================
     | HELPERS
     | ================================================================= */

    /**
     * Run a void closure and return true. Keeps parcelStatusChanged()
     * branch arms one-liners without the noisy `tap(true, ...)`.
     */
    private function tapTrue(callable $fn): bool
    {
        $fn();
        return true;
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