<?php

if (!function_exists('formatPhoneNumber')) {
    /**
     * Normalise a Kenyan mobile number.
     *
     * Accepts: 07XXXXXXXX, 7XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX, 00254...
     * Returns: MSISDN (e.g. 2547XXXXXXXX) or `0` + 9-digit local (per $preceeding),
     *          or `null` if the input was null/empty.
     */
    function formatPhoneNumber(?string $phone, string $preceeding = '254'): ?string
    {
        // Null / empty — caller has no number (e.g. cod_full bookings).
        // Return null so callers can skip the M-PESA step safely.
        if ($phone === null || trim($phone) === '') {
            return null;
        }

        $digits = preg_replace('/\D/', '', $phone) ?? '';

        // Strip leading 00 (e.g. 00254...)
        if (str_starts_with($digits, '00254')) {
            $digits = substr($digits, 2);
        }

        // Normalize to 9-digit local number (7XXXXXXXX or 1XXXXXXXX)
        if (str_starts_with($digits, '254') && strlen($digits) === 12) {
            $digits = substr($digits, 3); // 2547XXXXXXXX -> 7XXXXXXXX
        } elseif (str_starts_with($digits, '0') && strlen($digits) === 10) {
            $digits = substr($digits, 1); // 07XXXXXXXX -> 7XXXXXXXX
        }

        // Reject anything that isn't a valid 9-digit local number.
        // Return the original (non-null) input as-is — matches your
        // previous behaviour so invalid input is still visible to the user.
        if (
            !(
                (str_starts_with($digits, '7') || str_starts_with($digits, '1'))
                && strlen($digits) === 9
            )
        ) {
            return $phone;
        }

        // Prefix according to caller preference
        $preceeding = ltrim((string) $preceeding, '+'); // allow '+254' too

        if ($preceeding === '0') {
            return '0' . $digits;
        }

        if ($preceeding === '254') {
            return '254' . $digits;
        }

        // Unknown preceeding — default back to 254 format
        return '254' . $digits;
    }
}