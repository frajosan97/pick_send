<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ParcelIndexRequest;
use App\Models\Parcel;
use App\Models\Payment;
use App\Models\Town;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ParcelController extends Controller
{
    public function index(ParcelIndexRequest $request): Response
    {
        $f = $request->filters();

        $parcels = Parcel::query()
            ->with([
                'sender:id,name,business_name,phone',
                'recipient:id,name,phone',
                'town:id,name,route_id',
                'town.route:id,slug,name',
            ])
            ->when($f['q'], function ($q) use ($f) {
                $q->where(function ($q) use ($f) {
                    $q->where('tracking_no', 'like', "{$f['q']}%")
                        ->orWhere('sender_phone', 'like', "{$f['q']}%")
                        ->orWhere('recipient_phone', 'like', "{$f['q']}%");
                });
            })
            ->when($f['status'], fn($q) => $q->where('status', $f['status']))
            ->when($f['payment_option'], fn($q) => $q->where('payment_option', $f['payment_option']))
            ->when($f['town_id'], fn($q) => $q->where('town_id', $f['town_id']))
            ->when($f['from'], fn($q) => $q->where('created_at', '>=', $f['from']))
            ->when($f['to'], fn($q) => $q->where('created_at', '<=', $f['to']))
            ->orderBy($f['sort'], $f['dir'])
            ->limit(1000)  // DataTables handles client-side paging
            ->get()
            ->map(fn(Parcel $p) => [
                'id' => $p->id,
                'tracking_no' => $p->tracking_no,
                'sender_name' => $p->sender?->business_name ?? $p->sender?->name ?? $p->sender_name,
                'recipient_name' => $p->recipient?->name ?? $p->recipient_name,
                'recipient_phone' => $p->recipient_phone,
                'town' => $p->town?->name,
                'route' => $p->town?->route?->name,
                'status' => $p->status,
                'payment_option' => $p->payment_option,
                'total' => (int) $p->total,
                'amount_paid' => (int) $p->amount_paid,
                'balance_due' => $p->balanceDue(),
                'is_paid' => $p->isPaid(),
                'created_at' => $p->created_at?->toIso8601String(),
                'paid_at' => $p->paid_at?->toIso8601String(),
            ])
            ->values()
            ->all();

        return Inertia::render('admin/parcels/index', [
            'parcels' => $parcels,
            'filters' => [
                'q' => $f['q'],
                'status' => $f['status'],
                'payment_option' => $f['payment_option'],
                'town_id' => $f['town_id'],
                'from' => $f['from']?->toDateString(),
                'to' => $f['to']?->toDateString(),
                'sort' => $f['sort'],
                'dir' => $f['dir'],
                'per_page' => $f['per_page'],
            ],
            'options' => [
                'statuses' => (new Parcel)->statusMap(),
                'payment_options' => Parcel::PAYMENT_OPTIONS,
                'towns' => Town::orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }

    public function show(Request $request, Parcel $parcel): Response
    {
        $parcel->load([
            'sender:id,name,business_name,phone',
            'recipient:id,name,phone',
            'town:id,name,route_id',
            'town.route:id,slug,name',
            'payments' => fn($q) => $q->orderByDesc('created_at'),
            'payments.mpesaTransactions' => fn($q) => $q->orderByDesc('created_at'),
            'events' => fn($q) => $q->orderByDesc('happened_at'),
            'events.staff:id,name',
        ]);

        return Inertia::render('admin/parcels/show', [
            'parcel' => [
                'id' => $parcel->id,
                'tracking_no' => $parcel->tracking_no,
                'handover_code' => $parcel->handover_code,
                'status' => $parcel->status,
                'payment_option' => $parcel->payment_option,
                'created_at' => $parcel->created_at?->toIso8601String(),
                'paid_at' => $parcel->paid_at?->toIso8601String(),

                'sender' => $parcel->sender ? [
                    'id' => $parcel->sender->id,
                    'name' => $parcel->sender->business_name ?? $parcel->sender->name,
                    'phone' => $parcel->sender->phone,
                ] : [
                    'id' => null,
                    'name' => $parcel->sender_name,
                    'phone' => $parcel->sender_phone,
                ],

                'recipient' => $parcel->recipient ? [
                    'id' => $parcel->recipient->id,
                    'name' => $parcel->recipient->name,
                    'phone' => $parcel->recipient->phone,
                ] : [
                    'id' => null,
                    'name' => $parcel->recipient_name,
                    'phone' => $parcel->recipient_phone,
                ],

                'town' => $parcel->town?->name,
                'route' => $parcel->town?->route?->name,

                'contents' => [
                    'description' => $parcel->contents_description,
                    'kind' => $parcel->kind,
                    'estimated_worth' => (float) $parcel->estimated_worth,
                    'weight_code' => $parcel->weight_code,
                    'weight_kg' => $parcel->weight_kg !== null
                        ? (float) $parcel->weight_kg
                        : null,
                    'electronic_code' => $parcel->electronic_code,
                    'needs_packaging' => (bool) $parcel->needs_packaging,
                ],

                'money' => [
                    'delivery_fee' => (int) $parcel->delivery_fee,
                    'pack_fee' => (int) $parcel->pack_fee,
                    'drop_off_fee' => (int) $parcel->drop_off_fee,
                    'cod_amount' => (int) $parcel->cod_amount,
                    'cod_fee' => (int) $parcel->cod_fee,
                    'total' => (int) $parcel->total,
                    'amount_due_now' => (int) $parcel->amount_due_now,
                    'amount_paid' => (int) $parcel->amount_paid,
                    'balance_due' => $parcel->balanceDue(),
                    'points_earned' => (int) $parcel->points_earned,
                ],

                'payments' => $parcel->payments->map(function (Payment $pay) {
                    $method = $pay->method();
                    return [
                        'id' => $pay->id,
                        'type' => $pay->type,
                        'method' => $method,
                        'amount' => (int) $pay->amount,
                        'status' => $pay->status,
                        'mpesa_code' => $pay->mpesa_code,
                        'reference' => $pay->reference,
                        'phone' => $pay->phone,
                        'confirmed_at' => $pay->confirmed_at?->toIso8601String(),
                        'created_at' => $pay->created_at?->toIso8601String(),
                        'mpesa_transactions' => $method === 'mpesa'
                            ? $pay->mpesaTransactions->map(fn($tx) => [
                                'id' => $tx->id,
                                'status' => $tx->status,
                                'type' => $tx->type,
                                'amount' => (int) $tx->amount,
                                'phone' => $tx->phone,
                                'checkout_request_id' => $tx->checkout_request_id,
                                'merchant_request_id' => $tx->merchant_request_id,
                                'mpesa_receipt_number' => $tx->mpesa_receipt_number,
                                'result_code' => $tx->result_code,
                                'result_desc' => $tx->result_desc,
                                'completed_at' => $tx->completed_at?->toIso8601String(),
                                'created_at' => $tx->created_at?->toIso8601String(),
                            ])->values()->all()
                            : null,
                    ];
                })->values()->all(),

                'events' => $parcel->events->map(fn($e) => [
                    'id' => $e->id,
                    'status' => $e->status,
                    'label' => $e->label,
                    'description' => $e->description,
                    'staff' => $e->staff?->name,
                    'location' => $e->location,
                    'happened_at' => $e->happened_at?->toIso8601String(),
                ])->values()->all(),
            ],

            'statuses' => (new Parcel)->statusMap(),
        ]);
    }
}