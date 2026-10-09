<?php

// app/Http/Controllers/Admin/DashboardController.php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private AdminReportService $reports) {}

    public function index(Request $request): Response
    {
        [$from, $to] = $this->range($request);

        return Inertia::render('Admin/Dashboard', [
            'report' => $this->reports->payload($from, $to),
        ]);
    }

    /** Optional JSON endpoint if you want AJAX refresh without a full reload. */
    public function json(Request $request)
    {
        [$from, $to] = $this->range($request);

        return response()->json($this->reports->payload($from, $to));
    }

    private function range(Request $request): array
    {
        $preset = $request->string('range', '30d')->toString();

        return match ($preset) {
            'today' => [today(), today()],
            '7d' => [today()->subDays(6), today()],
            '30d' => [today()->subDays(29), today()],
            '90d' => [today()->subDays(89), today()],
            'mtd' => [today()->startOfMonth(), today()],
            'ytd' => [today()->startOfYear(), today()],
            'custom' => [
                Carbon::parse($request->input('from', today()->subDays(29)->toDateString())),
                Carbon::parse($request->input('to', today()->toDateString())),
            ],
            default => [today()->subDays(29), today()],
        };
    }
}
