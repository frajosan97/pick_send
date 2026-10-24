<?php

// app/Http/Controllers/HomeController.php

namespace App\Http\Controllers;

use App\Services\PricingService;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(PricingService $pricing): Response
    {
        return Inertia::render('welcome', [
            'pricing' => $pricing->buildConfig(),
        ]);
    }
}
