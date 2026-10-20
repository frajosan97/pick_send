<?php

use App\Http\Controllers\HomeController;
use App\Http\Controllers\MerchantController;
use App\Http\Controllers\ParcelController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SupplyRequestController;
use App\Http\Controllers\TrackingController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

/* Parcels */
Route::post('/parcels', [ParcelController::class, 'store'])->name('parcels.store');
Route::get('/parcels/{tracking}', [ParcelController::class, 'show'])->name('parcels.show');
Route::post('/parcels/{parcel}/confirm-payment', [PaymentController::class, 'confirm'])->name('parcels.confirm-payment');

/* Supplies */
Route::post('/supplies', [SupplyRequestController::class, 'store'])->name('supplies.store');

/* Tracking */
Route::get('/track/{tracking}', [TrackingController::class, 'show'])->name('track.show');

/* Merchant (OTP login) */
Route::prefix('merchant')
    ->name('merchant.')
    // ->middleware(['auth', 'verified'])
    ->group(function () {
        Route::post('/otp', [MerchantController::class, 'requestOtp'])->name('otp');
        Route::post('/verify', [MerchantController::class, 'verifyOtp'])->name('verify');
        Route::post('/logout', [MerchantController::class, 'logout'])->name('logout');
        Route::post('/withdraw', [MerchantController::class, 'withdraw'])->name('withdraw');
    });

Route::middleware(['auth', 'verified', 'can:admin'])
    ->prefix('admin')
    ->group(function () {
        // Dashboard
        Route::get('/', fn() => redirect()->route('dashboard'));
        Route::get('/dashboard', [\App\Http\Controllers\Admin\DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard.json', [\App\Http\Controllers\Admin\DashboardController::class, 'json'])->name('dashboard.json');

        // Admin
        Route::name('admin.')
            ->group(function () {
            Route::resources([
                'parcels' => \App\Http\Controllers\Admin\ParcelController::class,
                'pricing-constants' => \App\Http\Controllers\Admin\PricingConstantController::class,
                'general-prices' => \App\Http\Controllers\Admin\GeneralPriceController::class,
                'item-groups' => \App\Http\Controllers\Admin\ItemGroupController::class,
                'items' => \App\Http\Controllers\Admin\ItemController::class,
                'routes' => \App\Http\Controllers\Admin\RouteController::class,
                'routes.towns' => \App\Http\Controllers\Admin\TownController::class,
                'faqs' => \App\Http\Controllers\Admin\FaqController::class,
            ]);

            // Parcel mutations
            Route::prefix('parcels/{parcel}')
                ->name('parcels.')
                ->group(function () {
                Route::post('/retry-stk', [\App\Http\Controllers\Admin\ParcelActionController::class, 'retryStk'])->name('retry-stk');
                Route::post('/mark-paid', [\App\Http\Controllers\Admin\ParcelActionController::class, 'markPaid'])->name('mark-paid');
                Route::post('/claim', [\App\Http\Controllers\Admin\ParcelActionController::class, 'claim'])->name('claim');
                Route::post('/transition', [\App\Http\Controllers\Admin\ParcelActionController::class, 'transition'])->name('transition');
                Route::post('/payments/{payment}/link-tx', [\App\Http\Controllers\Admin\ParcelActionController::class, 'linkTx'])->name('payments.link-tx');
                Route::post('/cash-cod', [\App\Http\Controllers\Admin\ParcelActionController::class, 'cashCod'])->name('cash-cod');
                Route::get('/pdf', [\App\Http\Controllers\Admin\PdfController::class, 'download'])->name('pdf');
                Route::get('/print', [\App\Http\Controllers\Admin\PdfController::class, 'print'])->name('print');
            });

        });
    });

require __DIR__ . '/settings.php';
