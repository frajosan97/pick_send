<?php

namespace App\Services;

use App\Models\Parcel;
use App\Models\Payment;
use App\Models\PointLedger;
use App\Models\SupplyRequest;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Log;

class AdminReportService
{
    /* =================================================================
     | Window normalisation — every method agrees on "today"
     * =================================================================*/

    private function window(CarbonInterface $from, CarbonInterface $to): array
    {
        return [
            $from->copy()->startOfDay(),
            $to->copy()->endOfDay(),
        ];
    }

    /**
     * Run a KPI in isolation so a single bad column/table
     * cannot 500 the whole dashboard payload.
     */
    private function safe(callable $fn, $default = 0)
    {
        try {
            return $fn();
        } catch (\Throwable $e) {
            Log::error('AdminReportService metric failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return $default;
        }
    }

    /* =================================================================
     | TOP KPIs
     * =================================================================*/

    public function kpis(CarbonInterface $from, CarbonInterface $to): array
    {
        [$from, $to] = $this->window($from, $to);

        $bookedParcels = Parcel::whereBetween('created_at', [$from, $to]);

        // "Booked revenue" = total value of parcels booked in window.
        // "Collected" = actual cash received via successful payments.
        // These are intentionally two different KPIs.
        $bookedRevenue = $this->safe(
            fn() => (int) (clone $bookedParcels)->sum('total')
        );

        $collected = $this->safe(
            fn() => (int) Payment::query()
                ->where('status', 'success')
                ->whereIn('type', ['delivery', 'cod'])
                ->whereBetween('confirmed_at', [$from, $to])
                ->sum('amount')
        );

        $deliveryCollected = $this->safe(
            fn() => (int) Payment::query()
                ->where('status', 'success')
                ->where('type', 'delivery')
                ->whereBetween('confirmed_at', [$from, $to])
                ->sum('amount')
        );

        $codCollected = $this->safe(
            fn() => (int) Payment::query()
                ->where('status', 'success')
                ->where('type', 'cod')
                ->whereBetween('confirmed_at', [$from, $to])
                ->sum('amount')
        );

        $codFees = $this->safe(
            fn() => (int) (clone $bookedParcels)->sum('cod_fee')
        );

        $packFees = $this->safe(
            fn() => (int) (clone $bookedParcels)->sum('pack_fee')
        );

        // Physically in the system: booked through at_pickup.
        // Includes payment_on_delivery so ops sees reality.
        $inFlight = $this->safe(
            fn() => (clone $bookedParcels)->whereIn('status', [
                Parcel::STATUS_BOOKED,
                Parcel::STATUS_AWAITING_PAYMENT,
                Parcel::STATUS_PAYMENT_ON_DELIVERY,
                Parcel::STATUS_PAID,
                Parcel::STATUS_RECEIVED,
                Parcel::STATUS_IN_TRANSIT,
                Parcel::STATUS_AT_PICKUP,
            ])->count()
        );

        return [
            'parcels_total' => $this->safe(fn() => (clone $bookedParcels)->count()),
            'parcels_paid' => $this->safe(fn() => (clone $bookedParcels)->whereNotNull('paid_at')->count()),
            'parcels_delivered' => $this->safe(fn() => (clone $bookedParcels)->where('status', Parcel::STATUS_COLLECTED)->count()),
            'parcels_returned' => $this->safe(fn() => (clone $bookedParcels)->where('status', Parcel::STATUS_RETURNED)->count()),
            'parcels_in_flight' => $inFlight,

            'booked_revenue' => $bookedRevenue,
            'collected' => $collected,
            'collected_delivery' => $deliveryCollected,
            'cod_collected' => $codCollected,
            'cod_fees' => $codFees,
            'pack_fees' => $packFees,

            'new_users' => $this->safe(
                fn() => User::whereBetween('created_at', [$from, $to])->count()
            ),
            'new_merchants' => $this->safe(
                fn() => User::query()
                    ->where('type', 'merchant')
                    ->whereBetween('created_at', [$from, $to])
                    ->count()
            ),

            'wallet_liability' => $this->safe(fn() => (int) Wallet::sum('balance')),
            'points_outstanding' => $this->safe(fn() => (int) PointLedger::sum('points')),
        ];
    }

    /* =================================================================
     | TIME SERIES
     * =================================================================*/

    public function dailySeries(CarbonInterface $from, CarbonInterface $to): array
    {
        [$from, $to] = $this->window($from, $to);

        $booked = $this->safe(fn() => Parcel::query()
            ->selectRaw('DATE(created_at) as d, COUNT(*) as n, COALESCE(SUM(total),0) as booked_rev')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('d')
            ->get()
            ->keyBy('d'), collect());

        $collected = $this->safe(fn() => Payment::query()
            ->selectRaw('DATE(confirmed_at) as d, COALESCE(SUM(amount),0) as collected')
            ->where('status', 'success')
            ->whereIn('type', ['delivery', 'cod'])
            ->whereBetween('confirmed_at', [$from, $to])
            ->groupBy('d')
            ->get()
            ->keyBy('d'), collect());

        $out = [];
        $cursor = $from->copy()->startOfDay();

        while ($cursor <= $to) {
            $key = $cursor->toDateString();
            $out[] = [
                'date' => $key,
                'parcels' => (int) ($booked[$key]->n ?? 0),
                'booked_revenue' => (int) ($booked[$key]->booked_rev ?? 0),
                'collected' => (int) ($collected[$key]->collected ?? 0),
            ];
            $cursor = $cursor->addDay();
        }

        return $out;
    }

    /* =================================================================
     | TOWN BREAKDOWN
     * =================================================================*/

    public function townBreakdown(CarbonInterface $from, CarbonInterface $to): array
    {
        [$from, $to] = $this->window($from, $to);

        return $this->safe(fn() => Parcel::query()
            ->selectRaw('town_id, COUNT(*) as n, COALESCE(SUM(total),0) as rev')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('town_id')
            ->with('town:id,name,route_id', 'town.route:id,slug,name')
            ->get()
            ->map(fn($p) => [
                'town' => $p->town?->name ?? '—',
                'route' => $p->town?->route?->name ?? '—',
                'parcels' => (int) $p->n,
                'revenue' => (int) $p->rev,
            ])
            ->sortByDesc('parcels')
            ->values()
            ->all(), []);
    }

    /* =================================================================
     | TOP MERCHANTS
     * =================================================================*/

    public function topMerchants(CarbonInterface $from, CarbonInterface $to, int $limit = 10): array
    {
        [$from, $to] = $this->window($from, $to);

        return $this->safe(fn() => User::query()
            ->where('type', 'merchant')
            ->with('wallet') // avoids N+1 on $m->wallet
            ->withSum(
                ['sentParcels as cod_total' => fn($q) => $q->whereBetween('created_at', [$from, $to])],
                'cod_amount'
            )
            ->withCount(
                ['sentParcels as parcels_count' => fn($q) => $q->whereBetween('created_at', [$from, $to])]
            )
            ->orderByDesc('parcels_count')
            ->limit($limit)
            ->get()
            ->map(fn($m) => [
                'id' => $m->id,
                'name' => $m->business_name ?? $m->name,
                'phone' => $m->phone,
                'parcels' => (int) $m->parcels_count,
                'cod' => (int) ($m->cod_total ?? 0),
                'wallet' => (int) ($m->wallet?->balance ?? 0),
            ])
            ->all(), []);
    }

    /* =================================================================
     | PARCEL FUNNEL — built from Parcel::statusMap() so it can't drift
     * =================================================================*/

    public function parcelFunnel(CarbonInterface $from, CarbonInterface $to): array
    {
        [$from, $to] = $this->window($from, $to);

        $stages = $this->safe(fn() => array_keys((new Parcel)->statusMap()), []);

        $counts = $this->safe(fn() => Parcel::query()
            ->selectRaw('status, COUNT(*) as n')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('status')
            ->pluck('n', 'status'), collect());

        return collect($stages)->map(fn($s) => [
            'status' => $s,
            'count' => (int) ($counts[$s] ?? 0),
        ])->all();
    }

    /* =================================================================
     | PAYMENT SPLIT — customer-facing types by default
     * =================================================================*/

    public function paymentSplit(
        CarbonInterface $from,
        CarbonInterface $to,
        array $types = ['delivery', 'cod']
    ): array {
        [$from, $to] = $this->window($from, $to);

        return $this->safe(fn() => Payment::query()
            ->selectRaw('type, status, COUNT(*) as n, COALESCE(SUM(amount),0) as total')
            ->whereIn('type', $types)
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('type', 'status')
            ->get()
            ->map(fn($p) => [
                'type' => $p->type,
                'status' => $p->status,
                'count' => (int) $p->n,
                'amount' => (int) $p->total,
            ])
            ->all(), []);
    }

    /* =================================================================
     | SUPPLY REQUESTS
     * =================================================================*/

    public function supplyBreakdown(CarbonInterface $from, CarbonInterface $to): array
    {
        [$from, $to] = $this->window($from, $to);

        return $this->safe(fn() => SupplyRequest::query()
            ->selectRaw('frequency, status, COUNT(*) as n')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('frequency', 'status')
            ->get()
            ->map(fn($s) => [
                'frequency' => $s->frequency,
                'status' => $s->status,
                'count' => (int) $s->n,
            ])
            ->all(), []);
    }

    /* =================================================================
     | WALLET ACTIVITY — credits, debits, net
     * =================================================================*/

    public function walletActivity(CarbonInterface $from, CarbonInterface $to): array
    {
        [$from, $to] = $this->window($from, $to);

        return $this->safe(fn() => WalletTransaction::query()
            ->selectRaw("
                type,
                COUNT(*) as n,
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END)  as credits,
                SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as debits,
                SUM(amount)                                       as net
            ")
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('type')
            ->get()
            ->map(fn($t) => [
                'type' => $t->type,
                'count' => (int) $t->n,
                'credits' => (int) $t->credits,
                'debits' => (int) $t->debits,
                'net' => (int) $t->net,
            ])
            ->all(), []);
    }

    /* =================================================================
     | FULL PAYLOAD
     * =================================================================*/

    public function payload(CarbonInterface $from, CarbonInterface $to): array
    {
        [$from, $to] = $this->window($from, $to);

        return [
            'range' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
            ],
            'kpis' => $this->kpis($from, $to),
            'series' => $this->dailySeries($from, $to),
            'towns' => $this->townBreakdown($from, $to),
            'merchants' => $this->topMerchants($from, $to),
            'funnel' => $this->parcelFunnel($from, $to),
            'payments' => $this->paymentSplit($from, $to),
            'supplies' => $this->supplyBreakdown($from, $to),
            'wallet' => $this->walletActivity($from, $to),
        ];
    }
}