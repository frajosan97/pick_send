<?php

// app/Http/Controllers/Api/ConfigController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PricingService;
use Illuminate\Http\JsonResponse;

class ConfigController extends Controller
{
    public function __construct(private PricingService $pricing) {}

    public function index(): JsonResponse
    {
        return response()->json($this->pricing->buildConfig());
    }
}
