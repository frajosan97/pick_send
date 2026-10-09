<?php

// app/Services/AdminReportService.php

namespace App\Services;

use App\Models\Parcel;
use App\Models\Payment;
use App\Models\PointLedger;
use App\Models\SupplyRequest;
use App\Models\Town;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Carbon\CarbonInterface;

class AdminReportService
{
    /* =================================================================
     | TOP KPIs — one call, one screen's worth of numbers
     * =================================================================*/
    public function kpis(CarbonInterface $from, CarbonInterface $to): array
    {
        $parcels = Parcel::whereBetween('created_at', [$from, $to]);

        $revenue = (clone $parcels)->whereNotNull('paid_at')->sum('total');
        $collected = Payment::where('type', 'delivery')
            ->where('status', 'success')
            ->whereBetween('confirmed_at', [$from, $to])
            ->sum('amount');

        $codCollected = Payment::where('type', 'cod')
            ->where('status', 'success')
            ->whereBetween('confirmed_at', [$from, $to])
            ->sum('amount');

        $codFees = (clone $parcels)->whereNotNull('paid_at')->sum('cod_fee');
        $packFees = (clone $parcels)->whereNotNull('paid_at')->sum('pack_fee');

        return [
            'parcels_total' => (clone $parcels)->count(),
            'parcels_paid' => (clone $parcels)->whereNotNull('paid_at')->count(),
            'parcels_delivered' => (clone $parcels)->where('status', 'collected')->count(),
            'parcels_returned' => (clone $parcels)->where('status', 'returned')->count(),
            'parcels_in_flight' => (clone $parcels)->whereIn('status', [
                'paid',
                'received',
                'in_transit',
                'at_pickup',
            ])->count(),

            'revenue' => (int) $revenue,
            'collected' => (int) $collected,
            'cod_collected' => (int) $codCollected,
            'cod_fees' => (int) $codFees,
            'pack_fees' => (int) $packFees,

            'new_users' => User::whereBetween('created_at', [$from, $to])->count(),
            'new_merchants' => User::where('type', 'merchant')->whereBetween('created_at', [$from, $to])->count(),

            'wallet_liability' => (int) Wallet::sum('balance'),
            'points_outstanding' => (int) PointLedger::sum('points'),
        ];
    }

    /* =================================================================
     | TIME SERIES — for the line/bar charts
     * =================================================================*/
    public function dailySeries(CarbonInterface $from, CarbonInterface $to): array
    {
        $rows = Parcel::selectRaw('DATE(created_at) as d, COUNT(*) as n, SUM(total) as rev, SUM(cod_amount) as cod')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('d')->orderBy('d')->get()
            ->keyBy('d');

        $out = [];
        $cursor = $from->copy()->startOfDay();
        while ($cursor <= $to) {
            $key = $cursor->toDateString();
            $out[] = [
                'date' => $key,
                'parcels' => (int) ($rows[$key]->n ?? 0),
                'revenue' => (int) ($rows[$key]->rev ?? 0),
                'cod' => (int) ($rows[$key]->cod ?? 0),
            ];
            $cursor = $cursor->addDay();
        }

        return $out;
    }

    /* =================================================================
     | ROUTE / TOWN BREAKDOWN
     * =================================================================*/
    public function townBreakdown(CarbonInterface $from, CarbonInterface $to): array
    {
        return Parcel::selectRaw('town_id, COUNT(*) as n, SUM(total) as rev')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('town_id')
            ->with('town:id,name,route_id', 'town.route:id,slug,name')
            ->get()
            ->map(fn ($p) => [
                'town' => $p->town?->name ?? '—',
                'route' => $p->town?->route?->name ?? '—',
                'parcels' => (int) $p->n,
                'revenue' => (int) $p->rev,
            ])
            ->sortByDesc('parcels')
            ->values()
            ->all();
    }

    /* =================================================================
     | TOP MERCHANTS — by COD volume and wallet activity
     * =================================================================*/
    public function topMerchants(CarbonInterface $from, CarbonInterface $to, int $limit = 10): array
    {
        return User::where('type', 'merchant')
            ->withSum([
                'sentParcels as cod_total' => fn ($q) => $q->whereBetween('created_at', [$from, $to]),
            ], 'cod_amount')
            ->withCount([
                'sentParcels as parcels_count' => fn ($q) => $q->whereBetween('created_at', [$from, $to]),
            ])
            ->orderByDesc('parcels_count')
            ->limit($limit)
            ->get()
            ->map(fn ($m) => [
                'id' => $m->id,
                'name' => $m->business_name ?? $m->name,
                'phone' => $m->phone,
                'parcels' => (int) $m->parcels_count,
                'cod' => (int) ($m->cod_total ?? 0),
                'wallet' => (int) ($m->wallet?->balance ?? 0),
            ])
            ->all();
    }

    /* =================================================================
     | PARCEL FUNNEL — how many died at each stage
     * =================================================================*/
    public function parcelFunnel(CarbonInterface $from, CarbonInterface $to): array
    {
        $stages = [
            'draft',
            'awaiting_payment',
            'paid',
            'received',
            'in_transit',
            'at_pickup',
            'collected',
            'returned',
            'cancelled',
        ];

        $counts = Parcel::selectRaw('status, COUNT(*) as n')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('status')
            ->pluck('n', 'status');

        return collect($stages)->map(fn ($s) => [
            'status' => $s,
            'count' => (int) ($counts[$s] ?? 0),
        ])->all();
    }

    /* =================================================================
     | PAYMENT METHOD SPLIT
     * =================================================================*/
    public function paymentSplit(CarbonInterface $from, CarbonInterface $to): array
    {
        return Payment::selectRaw('type, status, COUNT(*) as n, SUM(amount) as total')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('type', 'status')
            ->get()
            ->map(fn ($p) => [
                'type' => $p->type,
                'status' => $p->status,
                'count' => (int) $p->n,
                'amount' => (int) $p->total,
            ])
            ->all();
    }

    /* =================================================================
     | SUPPLY REQUESTS STATUS
     * =================================================================*/
    public function supplyBreakdown(CarbonInterface $from, CarbonInterface $to): array
    {
        return SupplyRequest::selectRaw('frequency, status, COUNT(*) as n')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('frequency', 'status')
            ->get()
            ->map(fn ($s) => [
                'frequency' => $s->frequency,
                'status' => $s->status,
                'count' => (int) $s->n,
            ])
            ->all();
    }

    /* =================================================================
     | WALLET & PAYOUT ACTIVITY
     * =================================================================*/
    public function walletActivity(CarbonInterface $from, CarbonInterface $to): array
    {
        return WalletTransaction::selectRaw('type, COUNT(*) as n, SUM(amount) as total')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('type')
            ->get()
            ->map(fn ($t) => [
                'type' => $t->type,
                'count' => (int) $t->n,
                'amount' => (int) $t->total,
            ])
            ->all();
    }

    /* =================================================================
     | FULL PAYLOAD
     * =================================================================*/
    public function payload(CarbonInterface $from, CarbonInterface $to): array
    {
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
