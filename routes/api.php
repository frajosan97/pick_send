<?php

use App\Http\Controllers\Api\ConfigController;

Route::get('/config', [ConfigController::class, 'index']);
