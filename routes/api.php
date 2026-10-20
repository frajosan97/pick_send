<?php

use App\Http\Controllers\Api\ConfigController;
use App\Http\Controllers\Webhooks\MpesaCallbackController;
use Illuminate\Support\Facades\Route;

Route::get('/config', [ConfigController::class, 'index']);

/*
|--------------------------------------------------------------------------
| M-Pesa Webhooks
|--------------------------------------------------------------------------
| Public endpoints called by Safaricom Daraja.
| Protect callbacks using your configured middleware.
*/

Route::prefix('webhooks/payments')
    ->name('webhooks.payments.')
    ->group(function () {

        // STK Push callback
        Route::post('/callback', [MpesaCallbackController::class, 'stk'])
            ->name('callback');

        // B2C result callback
        Route::post('/result', [MpesaCallbackController::class, 'b2cResult'])
            ->name('result');

        // B2C timeout callback
        Route::post('/timeout', [MpesaCallbackController::class, 'b2cTimeout'])
            ->name('timeout');

        // C2B validation callback
        Route::post('/validation', [MpesaCallbackController::class, 'c2bValidation'])
            ->name('validation');

        // C2B confirmation callback
        Route::post('/confirmation', [MpesaCallbackController::class, 'c2bConfirmation'])
            ->name('confirmation');
    });