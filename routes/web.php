<?php

use App\Http\Controllers\Admin\DashboardController;
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

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard.json', [DashboardController::class, 'json'])->name('dashboard.json');
});

require __DIR__.'/settings.php';
