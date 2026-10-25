<?php

use App\Http\Controllers\Admin\PointController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\MerchantController;
use App\Http\Controllers\ParcelController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\SupplyRequestController;
use App\Http\Controllers\TrackingController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\ParcelController as AdminParcelController;
use App\Http\Controllers\Admin\PaymentController as AdminPaymentController;
use App\Http\Controllers\Admin\ParcelActionController;
use App\Http\Controllers\Admin\PdfController;
use App\Http\Controllers\Admin\PricingConstantController;
use App\Http\Controllers\Admin\SupplyRequestController as AdminSupplyRequestController;
use App\Http\Controllers\Admin\GeneralPriceController;
use App\Http\Controllers\Admin\ItemGroupController;
use App\Http\Controllers\Admin\ItemController;
use App\Http\Controllers\Admin\RouteController;
use App\Http\Controllers\Admin\TownController;
use App\Http\Controllers\Admin\FaqController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

Route::get('/', HomeController::class)->name('home');

// Parcels
Route::prefix('parcels')->name('parcels.')->group(function () {
    Route::post('/', [ParcelController::class, 'store'])->name('store');
    Route::get('/{tracking}', [ParcelController::class, 'show'])->name('show');
    Route::post('/{parcel}/confirm-payment', [PaymentController::class, 'confirm'])
        ->name('confirm-payment');
});

// Supplies
Route::post('/supplies', [SupplyRequestController::class, 'store'])->name('supplies.store');

// Tracking
Route::get('/track/{tracking}', [TrackingController::class, 'show'])->name('track.show');

/*
|--------------------------------------------------------------------------
| Merchant Routes (OTP Login)
|--------------------------------------------------------------------------
*/

Route::prefix('merchants')->name('merchants.')->group(function () {
    Route::get('/', [MerchantController::class, 'index'])->name('index');

    Route::post('/otp', [MerchantController::class, 'requestOtp'])->name('otp');
    Route::post('/verify', [MerchantController::class, 'verifyOtp'])->name('verify');
    Route::post('/logout', [MerchantController::class, 'logout'])->name('logout');
    Route::post('/withdraw', [MerchantController::class, 'withdraw'])->name('withdraw');
});

/*
|--------------------------------------------------------------------------
| Admin Routes
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified', 'can:admin'])
    ->prefix('admin')
    ->name('admin.')
    ->group(function () {
        // Dashboard
        Route::redirect('/', '/admin/dashboard');
        Route::get('/dashboard', [DashboardController::class, 'index'])
            ->name('dashboard');
        Route::get('/dashboard.json', [DashboardController::class, 'json'])
            ->name('dashboard.json');

        // Resource routes
        Route::resources([
            'users' => UserController::class,
            'parcels' => AdminParcelController::class,
            'payments' => AdminPaymentController::class,
            'points' => PointController::class,
            'supply-requests' => AdminSupplyRequestController::class,
        ]);

        // Parcel mutations
        Route::prefix('parcels/{parcel}')->name('parcels.')->group(function () {
            Route::post('/retry-stk', [ParcelActionController::class, 'retryStk'])
                ->name('retry-stk');
            Route::post('/mark-paid', [ParcelActionController::class, 'markPaid'])
                ->name('mark-paid');
            Route::post('/claim', [ParcelActionController::class, 'claim'])
                ->name('claim');
            Route::post('/transition', [ParcelActionController::class, 'transition'])
                ->name('transition');
            Route::post('/payments/{payment}/link-tx', [ParcelActionController::class, 'linkTx'])
                ->name('payments.link-tx');
            Route::post('/cash-cod', [ParcelActionController::class, 'cashCod'])
                ->name('cash-cod');
            Route::get('/pdf', [PdfController::class, 'download'])
                ->name('pdf');
            Route::get('/print', [PdfController::class, 'print'])
                ->name('print');
        });

        Route::prefix('suply-requests/{supplyRequest}')->name('supply-requests.')->group(function () {
            Route::patch('/update-status', [AdminSupplyRequestController::class, 'updateStatus'])
                ->name('update-status');
            Route::patch('/quote', [AdminSupplyRequestController::class, 'quote'])
                ->name('quote');
            Route::patch('/payment', [AdminSupplyRequestController::class, 'recordPayment'])
                ->name('record-payment');
            Route::post('/stk', [AdminSupplyRequestController::class, 'initiateStk'])
                ->name('initiate-stk');
        });

        // Settings
        Route::prefix('settings')->group(function () {
            Route::resources([
                'pricing-constants' => PricingConstantController::class,
                'general-prices' => GeneralPriceController::class,
                'item-groups' => ItemGroupController::class,
                'items' => ItemController::class,
                'routes' => RouteController::class,
                'routes.towns' => TownController::class,
                'faqs' => FaqController::class,
            ]);
        });
    });

require __DIR__ . '/settings.php';