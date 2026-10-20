<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AdminReportService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(private AdminReportService $reports)
    {
    }

    public function index(Request $request): Response
    {
        [$from, $to] = $this->range($request);

        return Inertia::render('admin/dashboard', [
            'report' => $this->reports->payload($from, $to),
        ]);
    }

    public function json(Request $request)
    {
        [$from, $to] = $this->range($request);

        return response()->json($this->reports->payload($from, $to));
    }

    /**
     * Resolve the requested window into [from, to], already normalised
     * to start-of-day / end-of-day in app.timezone.
     */
    private function range(Request $request): array
    {
        $tz = config('app.timezone');
        $preset = $request->string('range', '30d')->toString();

        [$from, $to] = match ($preset) {
            'today' => [now($tz)->startOfDay(), now($tz)->endOfDay()],

            '7d' => [
                now($tz)->subDays(6)->startOfDay(),
                now($tz)->endOfDay(),
            ],

            '30d' => [
                now($tz)->subDays(29)->startOfDay(),
                now($tz)->endOfDay(),
            ],

            '90d' => [
                now($tz)->subDays(89)->startOfDay(),
                now($tz)->endOfDay(),
            ],

            'mtd' => [now($tz)->startOfMonth(), now($tz)->endOfDay()],

            'ytd' => [now($tz)->startOfYear(), now($tz)->endOfDay()],

            'custom' => [
                Carbon::parse(
                    $request->input('from', today()->subDays(29)->toDateString()),
                    $tz
                )->startOfDay(),
                Carbon::parse(
                    $request->input('to', today()->toDateString()),
                    $tz
                )->endOfDay(),
            ],

            default => [
                now($tz)->subDays(29)->startOfDay(),
                now($tz)->endOfDay(),
            ],
        };

        // Reversed window → swap.
        if ($from->greaterThan($to)) {
            [$from, $to] = [
                $to->copy()->startOfDay(),
                $from->copy()->endOfDay(),
            ];
        }

        // Cap absurdly wide ranges (protects the daily-series loop).
        if ($from->diffInDays($to) > 366) {
            $from = $to->copy()->subDays(366)->startOfDay();
        }

        return [$from, $to];
    }
}