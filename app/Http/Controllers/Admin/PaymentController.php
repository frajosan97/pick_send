<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PaymentIndexRequest;
use App\Models\Payment;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    /**
     * Filterable payments list.
     *
     * Returns a plain array (not a paginator) because the front-end uses
     * client-side DataTables: all rows are shipped once and sorting,
     * paging, length-change, info and search are handled in the browser.
     */
    public function index(PaymentIndexRequest $request): Response
    {
        $f = $request->filters();

        $payments = Payment::query()
            ->with([
                'parcel:id,tracking_no,recipient_name,recipient_phone,status,payment_option,total',
                'user:id,name,business_name,phone',
                'mpesaTransaction',
            ])
            ->when($f['q'], function ($q) use ($f) {
                $q->where(function ($q) use ($f) {
                    $term = "{$f['q']}%";
                    $q->where('reference', 'like', $term)
                        ->orWhere('phone', 'like', $term)
                        ->orWhereHas('parcel', fn($p) => $p->where('tracking_no', 'like', $term))
                        ->orWhereHas(
                            'mpesaTransaction',
                            fn($m) => $m
                                ->where('mpesa_receipt_number', 'like', $term)
                                ->orWhere('checkout_request_id', 'like', $term)
                        );
                });
            })
            ->when($f['type'], fn($q) => $q->where('type', $f['type']))
            ->when($f['status'], fn($q) => $q->where('status', $f['status']))
            ->when($f['channel'], fn($q) => $q->where('channel', $f['channel']))
            ->when($f['parcel_id'], fn($q) => $q->where('parcel_id', $f['parcel_id']))
            ->when($f['user_id'], fn($q) => $q->where('user_id', $f['user_id']))
            ->when($f['from'], fn($q) => $q->where('created_at', '>=', $f['from']))
            ->when($f['to'], fn($q) => $q->where('created_at', '<=', $f['to']))
            ->orderBy($f['sort'], $f['dir'])
            ->get()                    // ⬅ flat collection, NOT paginate()
            ->map(fn(Payment $pay) => $this->toRow($pay))
            ->values();                // ⬅ reindex 0..n-1 for clean JSON array

        return Inertia::render('admin/payments/index', [
            'payments' => $payments,
            'filters' => [
                'q' => $f['q'],
                'type' => $f['type'],
                'status' => $f['status'],
                'channel' => $f['channel'],
                'parcel_id' => $f['parcel_id'],
                'user_id' => $f['user_id'],
                'from' => $f['from']?->toDateString(),
                'to' => $f['to']?->toDateString(),
                'sort' => $f['sort'],
                'dir' => $f['dir'],
                'per_page' => $f['per_page'],
            ],
            'options' => [
                'types' => Payment::TYPE_LABELS ?? [
                    Payment::TYPE_DELIVERY => 'Delivery',
                    Payment::TYPE_COD => 'COD',
                    Payment::TYPE_WITHDRAWAL => 'Withdrawal',
                    Payment::TYPE_REFUND => 'Refund',
                    Payment::TYPE_POINTS => 'Points',
                ],
                'statuses' => [
                    Payment::STATUS_PENDING => 'Pending',
                    Payment::STATUS_SUCCESS => 'Success',
                    Payment::STATUS_FAILED => 'Failed',
                ],
                'channels' => [
                    Payment::CHANNEL_PENDING => 'Pending',
                    Payment::CHANNEL_MPESA => 'M-PESA',
                    Payment::CHANNEL_CASH => 'Cash',
                    Payment::CHANNEL_WALLET => 'Wallet',
                    Payment::CHANNEL_MANUAL => 'Manual',
                ],
            ],
        ]);
    }

    /**
     * Single source of truth for the row shape returned to the client.
     *
     * @return array<string, mixed>
     */
    private function toRow(Payment $pay): array
    {
        $tx = $pay->mpesaTransaction;

        return [
            'id' => $pay->id,
            'type' => $pay->type,
            'status' => $pay->status,
            'channel' => $pay->channel,
            'method' => $pay->method(),
            'amount' => (int) $pay->amount,
            'phone' => $pay->phone,
            'reference' => $pay->reference,
            'receipt_number' => $pay->receiptNumber(),
            'confirmed_at' => $pay->confirmed_at?->toIso8601String(),
            'created_at' => $pay->created_at?->toIso8601String(),

            'parcel' => $pay->parcel ? [
                'id' => $pay->parcel->id,
                'tracking_no' => $pay->parcel->tracking_no,
                'recipient_name' => $pay->parcel->recipient_name,
                'recipient_phone' => $pay->parcel->recipient_phone,
                'status' => $pay->parcel->status,
                'payment_option' => $pay->parcel->payment_option,
                'total' => (int) $pay->parcel->total,
            ] : null,

            'user' => $pay->user ? [
                'id' => $pay->user->id,
                'name' => $pay->user->business_name ?? $pay->user->name,
                'phone' => $pay->user->phone,
            ] : null,

            'mpesa_transaction' => $tx ? [
                'id' => $tx->id,
                'status' => $tx->status,
                'type' => $tx->type,
                'amount' => (int) $tx->amount,
                'phone' => $tx->phone,
                'mpesa_receipt_number' => $tx->mpesa_receipt_number,
                'checkout_request_id' => $tx->checkout_request_id,
                'result_code' => $tx->result_code,
                'result_desc' => $tx->result_desc,
                'completed_at' => $tx->completed_at?->toIso8601String(),
            ] : null,
        ];
    }
}