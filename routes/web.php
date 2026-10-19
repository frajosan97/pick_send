<?php

use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\FaqController;
use App\Http\Controllers\Admin\GeneralPriceController;
use App\Http\Controllers\Admin\ItemController;
use App\Http\Controllers\Admin\ItemGroupController;
use App\Http\Controllers\Admin\PricingConstantController;
use App\Http\Controllers\Admin\RouteController;
use App\Http\Controllers\Admin\TownController;
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

/* Payments */
Route::post('/parcels/{parcel}/confirm-payment', [PaymentController::class, 'confirm'])
    ->name('parcels.confirm-payment');

/* Supplies */
Route::post('/supplies', [SupplyRequestController::class, 'store'])->name('supplies.store');

/* Tracking */
Route::get('/track/{tracking}', [TrackingController::class, 'show'])->name('track.show');

/* Merchant (OTP login) */
Route::post('/merchant/otp', [MerchantController::class, 'requestOtp'])->name('merchant.otp');
Route::post('/merchant/verify', [MerchantController::class, 'verifyOtp'])->name('merchant.verify');
Route::post('/merchant/logout', [MerchantController::class, 'logout'])->name('merchant.logout');
Route::post('/merchant/withdraw', [MerchantController::class, 'withdraw'])->name('merchant.withdraw');

Route::prefix('admin')
    // ->name('admin.')
    ->middleware(['auth', 'verified'])
    ->group(function () {
        // Dashboard
        Route::get('/', fn() => redirect()->route('dashboard'));
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard.json', [DashboardController::class, 'json'])->name('dashboard.json');

        Route::name('admin.')
            ->group(function () {
                // Pricing
                Route::resource('pricing-constants', PricingConstantController::class)->except(['show']);
                Route::resource('general-prices', GeneralPriceController::class)->except(['show']);

                // Catalog
                Route::resource('item-groups', ItemGroupController::class)->except(['show']);
                Route::resource('items', ItemController::class)->except(['show']);

                // Logistics
                Route::resource('routes', RouteController::class)->except(['show']);
                Route::resource('routes.towns', TownController::class)->except(['show', 'index']);

                // Content
                Route::resource('faqs', FaqController::class)->except(['show']);
            });
    });

require __DIR__ . '/settings.php';
