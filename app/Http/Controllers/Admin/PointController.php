<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PointLedger;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PointController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'sort' => ['nullable', 'in:balance,earned,redeemed,user'],
            'dir' => ['nullable', 'in:asc,desc'],
        ]);

        $q = $validated['q'] ?? null;
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;
        $sort = $validated['sort'] ?? 'balance';
        $dir = $validated['dir'] ?? 'desc';

        /*
         | Aggregate per-user totals. PointLedger rows are keyed by phone,
         | but the admin view is per-user, so we join on users.phone.
         | Rows without a matching user (historical data) are still
         | counted separately as "orphan" rows and exposed via a count.
         */
        $rows = DB::table('point_ledgers as pl')
            ->join('users', 'users.phone', '=', 'pl.phone')
            ->when($from, fn($q2) => $q2->where('pl.created_at', '>=', $from . ' 00:00:00'))
            ->when($to, fn($q2) => $q2->where('pl.created_at', '<=', $to . ' 23:59:59'))
            ->when($q, function ($q2) use ($q) {
                $like = "%{$q}%";
                $q2->where(function ($q3) use ($like) {
                    $q3->where('users.name', 'like', $like)
                        ->orWhere('users.email', 'like', $like)
                        ->orWhere('users.phone', 'like', $like)
                        ->orWhere('pl.phone', 'like', $like);
                });
            })
            ->groupBy('users.id', 'users.name', 'users.email', 'users.phone')
            ->select([
                'users.id as user_id',
                'users.name',
                'users.email',
                'users.phone',
                DB::raw('SUM(pl.points) as balance'),
                DB::raw("SUM(CASE WHEN pl.reason IN ('earned','earned_bonus') THEN pl.points ELSE 0 END) as earned"),
                DB::raw("SUM(CASE WHEN pl.reason = 'redeemed' THEN ABS(pl.points) ELSE 0 END) as redeemed"),
                DB::raw("SUM(CASE WHEN pl.reason IN ('expired','reversed') THEN ABS(pl.points) ELSE 0 END) as lost"),
                DB::raw('MAX(pl.created_at) as last_activity_at'),
            ])
            ->orderBy(match ($sort) {
                'earned' => 'earned',
                'redeemed' => 'redeemed',
                'user' => 'users.name',
                default => 'balance',
            }, $dir)
            ->get()
            ->map(fn($row) => [
                'user_id' => (int) $row->user_id,
                'name' => $row->name,
                'email' => $row->email,
                'phone' => $row->phone,
                'balance' => (int) $row->balance,
                'earned' => (int) $row->earned,
                'redeemed' => (int) $row->redeemed,
                'lost' => (int) $row->lost,
                'last_activity_at' => $row->last_activity_at,
            ]);

        /*
         | Orphan rows: ledger entries whose phone doesn't match any user.
         | Useful for spotting data-integrity drift (e.g. user phone changed
         | after earning points). Exposed as a read-only count.
         */
        $orphans = DB::table('point_ledgers as pl')
            ->leftJoin('users', 'users.phone', '=', 'pl.phone')
            ->whereNull('users.id')
            ->when($from, fn($q2) => $q2->where('pl.created_at', '>=', $from . ' 00:00:00'))
            ->when($to, fn($q2) => $q2->where('pl.created_at', '<=', $to . ' 23:59:59'))
            ->select(
                DB::raw('COUNT(*) as entries'),
                DB::raw('COALESCE(SUM(pl.points), 0) as points'),
            )
            ->first();

        $totals = DB::table('point_ledgers')
            ->when($from, fn($q2) => $q2->where('created_at', '>=', $from . ' 00:00:00'))
            ->when($to, fn($q2) => $q2->where('created_at', '<=', $to . ' 23:59:59'))
            ->select([
                DB::raw("COALESCE(SUM(CASE WHEN reason IN ('earned','earned_bonus') THEN points ELSE 0 END), 0) as earned"),
                DB::raw("COALESCE(SUM(CASE WHEN reason = 'redeemed' THEN ABS(points) ELSE 0 END), 0) as redeemed"),
                DB::raw("COALESCE(SUM(CASE WHEN reason IN ('expired','reversed') THEN ABS(points) ELSE 0 END), 0) as lost"),
                DB::raw('COALESCE(SUM(points), 0) as balance'),
            ])
            ->first();

        return Inertia::render('admin/points/index', [
            'rows' => $rows,
            'totals' => [
                'balance' => (int) $totals->balance,
                'earned' => (int) $totals->earned,
                'redeemed' => (int) $totals->redeemed,
                'lost' => (int) $totals->lost,
            ],
            'orphans' => [
                'entries' => (int) ($orphans->entries ?? 0),
                'points' => (int) ($orphans->points ?? 0),
            ],
            'filters' => [
                'q' => $q,
                'from' => $from,
                'to' => $to,
                'sort' => $sort,
                'dir' => $dir,
            ],
            'options' => [
                'sorts' => [
                    'balance' => 'Balance',
                    'earned' => 'Earned',
                    'redeemed' => 'Redeemed',
                    'user' => 'Name',
                ],
            ],
        ]);
    }
}