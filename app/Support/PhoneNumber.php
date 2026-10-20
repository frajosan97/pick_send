<?php

namespace App\Support;

class PhoneNumber
{
    /**
     * Normalize any Kenyan MSISDN to +2547XXXXXXXX or +2541XXXXXXXX.
     * Accepts: 0712..., 712..., +254712..., 254712..., 254 712...
     * Returns null if it doesn't look like a Kenyan mobile.
     */
    public static function ke(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $raw);

        if ($digits === '') {
            return null;
        }

        // 254712345678 (12 digits, starts 254) → keep
        if (str_starts_with($digits, '254') && strlen($digits) === 12) {
            $local = substr($digits, 3);
        }
        // 0712345678 (10 digits, starts 0) → strip leading 0
        elseif (str_starts_with($digits, '0') && strlen($digits) === 10) {
            $local = substr($digits, 1);
        }
        // 712345678 (9 digits)
        elseif (strlen($digits) === 9) {
            $local = $digits;
        } else {
            return null;
        }

        // 7XXXXXXXX = Safaricom/Airtel mobile, 1XXXXXXXX = newer mobile range
        if (!preg_match('/^[17]\d{8}$/', $local)) {
            return null;
        }

        return '+254' . $local;
    }

    /** Format for STK push (Safaricom wants 2547..., no +). */
    public static function toStk(?string $raw): ?string
    {
        $e164 = self::ke($raw);
        return $e164 ? ltrim($e164, '+') : null;
    }
}