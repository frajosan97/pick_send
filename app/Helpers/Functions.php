<?php

if (!function_exists('formatPhoneNumber')) {
    function formatPhoneNumber(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';

        if (str_starts_with($digits, '00254')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '254') && strlen($digits) === 12) {
            return $digits;
        }

        if (str_starts_with($digits, '0') && strlen($digits) === 10) {
            return '254' . substr($digits, 1);
        }

        if (
            (str_starts_with($digits, '7') || str_starts_with($digits, '1'))
            && strlen($digits) === 9
        ) {
            return '254' . $digits;
        }

        return $phone;
    }
}