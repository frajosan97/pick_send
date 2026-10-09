<?php

// routes/api.php

use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Webhooks\MpesaCallbackController;
use Illuminate\Support\Facades\Route;

Route::get('/config', [ConfigController::class, 'index']);

/*
|--------------------------------------------------------------------------
| M-Pesa Webhooks
|--------------------------------------------------------------------------
| These endpoints are called by Safaricom. They must be:
|   - Publicly reachable (no auth middleware)
|   - Excluded from CSRF (api middleware group already does this)
|   - IP-restricted (see Security section below)
*/

Route::prefix('webhooks/mpesa')
    ->name('webhooks.mpesa.')
    ->middleware(['mpesa.ip'])
    ->group(function () {

        // STK Push result (Lipa Na M-Pesa)
        Route::post('stk', [MpesaCallbackController::class, 'stk'])
            ->name('stk');

        // B2C result (withdrawals)
        Route::post('b2c/result', [MpesaCallbackController::class, 'b2cResult'])
            ->name('b2c.result');

        // B2C timeout
        Route::post('b2c/timeout', [MpesaCallbackController::class, 'b2cTimeout'])
            ->name('b2c.timeout');

        // C2B validation (optional — Safaricom calls this before accepting a payment)
        Route::post('c2b/validation', [MpesaCallbackController::class, 'c2bValidation'])
            ->name('c2b.validation');

        // C2B confirmation (payment confirmed)
        Route::post('c2b/confirmation', [MpesaCallbackController::class, 'c2bConfirmation'])
            ->name('c2b.confirmation');
    });