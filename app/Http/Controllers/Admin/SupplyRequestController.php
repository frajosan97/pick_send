<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\SupplyRequest;
use App\Models\Town;
use App\Services\MpesaService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SupplyRequestController extends Controller
{
    /* ==============================================================
     | LIST
     | ============================================================== */

    public function index(Request $request)
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(array_keys(SupplyRequest::STATUSES))],
            'frequency' => ['nullable', Rule::in(array_keys(SupplyRequest::FREQUENCIES))],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'trashed' => ['nullable', 'in:0,1'],
            'recurring' => ['nullable', 'in:0,1'],
        ]);

        $q = $validated['q'] ?? null;
        $status = $validated['status'] ?? null;
        $frequency = $validated['frequency'] ?? null;
        $from = $validated['from'] ?? null;
        $to = $validated['to'] ?? null;
        $trashed = ($validated['trashed'] ?? '0') === '1';
        $recurring = ($validated['recurring'] ?? '0') === '1';

        $requests = SupplyRequest::query()
            ->when($trashed, fn($q2) => $q2->onlyTrashed())
            ->when($recurring, fn($q2) => $q2->where('recurring', true))
            ->with([
                'user' => fn($q2) => $q2
                    ->withTrashed()
                    ->select('id', 'name', 'email', 'phone', 'deleted_at'),
                'town' => fn($q2) => $q2->select('id', 'name'),
            ])
            ->when($status, fn($q2) => $q2->where('status', $status))
            ->when($frequency, fn($q2) => $q2->where('frequency', $frequency))
            ->when($from, fn($q2) => $q2->where('created_at', '>=', $from . ' 00:00:00'))
            ->when($to, fn($q2) => $q2->where('created_at', '<=', $to . ' 23:59:59'))
            ->when($q, function ($q2) use ($q) {
                $like = "%{$q}%";
                $q2->where(function ($q3) use ($like) {
                    $q3->where('name', 'like', $like)
                        ->orWhere('phone', 'like', $like)
                        ->orWhere('what', 'like', $like)
                        ->orWhereHas(
                            'user',
                            fn($q4) => $q4
                                ->withTrashed()
                                ->where(
                                    fn($q5) => $q5
                                        ->where('name', 'like', $like)
                                        ->orWhere('email', 'like', $like)
                                )
                        );
                });
            })
            ->latest('id')
            ->get()
            ->map(fn(SupplyRequest $sr) => [
                'id' => $sr->id,
                'parent_id' => $sr->parent_id,
                'scheduled_for' => $sr->scheduled_for?->toDateString(),
                'recurring' => $sr->recurring,
                'name' => $sr->name,
                'phone' => $sr->phone,
                'what' => $sr->what,
                'frequency' => $sr->frequency,
                'status' => $sr->status,
                'pickup_from' => $sr->pickup_from,
                'supplier_phone' => $sr->supplier_phone,
                'quoted_amount' => $sr->quoted_amount,
                'amount_paid' => $sr->amountPaid(),
                'balance_due' => $sr->balanceDue(),
                'town' => $sr->town ? [
                    'id' => $sr->town->id,
                    'name' => $sr->town->name,
                ] : null,
                'user' => $sr->user ? [
                    'id' => $sr->user->id,
                    'name' => $sr->user->name,
                    'email' => $sr->user->email,
                    'phone' => $sr->user->phone,
                ] : null,
                'created_at' => $sr->created_at?->toIso8601String(),
                'deleted_at' => $sr->deleted_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/supply-requests/index', [
            'requests' => $requests,
            'filters' => [
                'q' => $q,
                'status' => $status,
                'frequency' => $frequency,
                'from' => $from,
                'to' => $to,
                'trashed' => $trashed,
                'recurring' => $recurring,
            ],
            'options' => [
                'statuses' => SupplyRequest::STATUSES,
                'frequencies' => SupplyRequest::FREQUENCIES,
            ],
        ]);
    }

    /* ==============================================================
     | DETAIL
     | ============================================================== */

    public function show(SupplyRequest $supplyRequest)
    {
        $supplyRequest->load([
            'user' => fn($q) => $q->withTrashed(),
            'town',
            'parent',
            'occurrences' => fn($q) => $q->latest('scheduled_for')->limit(20),
        ]);

        /*
         * Eager-load mpesaTransaction so the map below doesn't issue
         * N+1 queries. `with('mpesaTransaction')` matches the hasOne
         * relation on Payment (UNIQUE(payment_id) enforced in DB).
         */
        $payments = $supplyRequest->payments()
            ->with('mpesaTransaction')
            ->latest()
            ->get()
            ->map(function (Payment $p) {
                $tx = $p->mpesaTransaction;

                return [
                    'id' => $p->id,
                    'type' => $p->type,
                    'amount' => $p->amount,
                    'channel' => $p->channel,
                    'method' => $p->method(), // 'mpesa' | 'cash'
                    'status' => $p->status,
                    'reference' => $p->reference,
                    'phone' => $p->phone,
                    'mpesa_code' => $tx?->mpesa_receipt_number,
                    'confirmed_at' => $p->confirmed_at?->toIso8601String(),
                    'created_at' => $p->created_at?->toIso8601String(),
                    'mpesa_transactions' => $tx ? [
                        [
                            'id' => $tx->id,
                            'status' => $tx->status,
                            'type' => $tx->type,
                            'amount' => $tx->amount,
                            'phone' => $tx->phone,
                            'checkout_request_id' => $tx->checkout_request_id,
                            'merchant_request_id' => $tx->merchant_request_id,
                            'mpesa_receipt_number' => $tx->mpesa_receipt_number,
                            'result_code' => $tx->result_code,
                            'result_desc' => $tx->result_desc,
                            'completed_at' => $tx->completed_at?->toIso8601String(),
                            'created_at' => $tx->created_at?->toIso8601String(),
                        ]
                    ] : [],
                ];
            });

        return Inertia::render('admin/supply-requests/show', [
            'request' => [
                'id' => $supplyRequest->id,
                'parent_id' => $supplyRequest->parent_id,
                'scheduled_for' => $supplyRequest->scheduled_for?->toDateString(),
                'recurring' => $supplyRequest->recurring,
                'name' => $supplyRequest->name,
                'phone' => $supplyRequest->phone,
                'what' => $supplyRequest->what,
                'pickup_from' => $supplyRequest->pickup_from,
                'supplier_phone' => $supplyRequest->supplier_phone,
                'frequency' => $supplyRequest->frequency,
                'status' => $supplyRequest->status,
                'quoted_amount' => $supplyRequest->quoted_amount,
                'quoted_at' => $supplyRequest->quoted_at?->toIso8601String(),
                'amount_paid' => $supplyRequest->amountPaid(),
                'balance_due' => $supplyRequest->balanceDue(),
                'is_fully_paid' => $supplyRequest->isFullyPaid(),
                'town' => $supplyRequest->town ? [
                    'id' => $supplyRequest->town->id,
                    'name' => $supplyRequest->town->name,
                ] : null,
                'user' => $supplyRequest->user ? [
                    'id' => $supplyRequest->user->id,
                    'name' => $supplyRequest->user->name,
                    'email' => $supplyRequest->user->email,
                    'phone' => $supplyRequest->user->phone,
                    'deleted_at' => $supplyRequest->user->deleted_at?->toIso8601String(),
                ] : null,
                'parent' => $supplyRequest->parent ? [
                    'id' => $supplyRequest->parent->id,
                    'scheduled_for' => $supplyRequest->parent->scheduled_for?->toDateString(),
                    'status' => $supplyRequest->parent->status,
                ] : null,
                'occurrences' => $supplyRequest->occurrences->map(fn($occ) => [
                    'id' => $occ->id,
                    'scheduled_for' => $occ->scheduled_for?->toDateString(),
                    'status' => $occ->status,
                    'quoted_amount' => $occ->quoted_amount,
                ]),
                'payments' => $payments,
                'created_at' => $supplyRequest->created_at?->toIso8601String(),
                'updated_at' => $supplyRequest->updated_at?->toIso8601String(),
                'deleted_at' => $supplyRequest->deleted_at?->toIso8601String(),
            ],
            'options' => [
                'statuses' => SupplyRequest::STATUSES,
                'frequencies' => SupplyRequest::FREQUENCIES,
            ],
        ]);
    }

    /* ==============================================================
     | CREATE / STORE
     | ============================================================== */

    public function create(Request $request)
    {
        $userId = $request->query('user_id');

        return Inertia::render('admin/supply-requests/create', [
            'defaults' => [
                'user_id' => $userId ? (int) $userId : null,
            ],
            'options' => [
                'statuses' => SupplyRequest::STATUSES,
                'frequencies' => SupplyRequest::FREQUENCIES,
                'towns' => Town::query()
                    ->orderBy('name')
                    ->get(['id', 'name']),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate(SupplyRequest::rules());

        $validated['status'] = $validated['status'] ?? SupplyRequest::STATUS_PENDING;

        // Mark as master if this is a recurring series.
        $validated['recurring'] = ($validated['frequency'] !== SupplyRequest::FREQ_ONCE);

        $supplyRequest = SupplyRequest::create($validated);

        return redirect()
            ->route('admin.supply-requests.show', $supplyRequest)
            ->with('success', "Supply request #{$supplyRequest->id} created.");
    }

    /* ==============================================================
     | QUOTE
     | ============================================================== */

    public function quote(Request $request, SupplyRequest $supplyRequest)
    {
        $validated = $request->validate([
            'quoted_amount' => ['required', 'integer', 'min:1'],
        ]);

        // Prevent re-quoting after payments have begun.
        if (
            $supplyRequest->amountPaid() > 0
            && $supplyRequest->quoted_amount !== null
            && $supplyRequest->quoted_amount !== (int) $validated['quoted_amount']
        ) {
            return back()->with(
                'error',
                'Cannot change quote after payments have been received.'
            );
        }

        // Compute the balance as it WILL BE after applying the new quote,
        // not before. Otherwise a downward re-quote could leave the
        // request in `awaiting_payment` even though the customer has
        // already paid enough.
        $paidAfter = $supplyRequest->amountPaid();
        $balanceAfter = max(0, (int) $validated['quoted_amount'] - $paidAfter);

        $supplyRequest->update([
            'quoted_amount' => $validated['quoted_amount'],
            'quoted_at' => now(),
            'status' => $balanceAfter === 0
                ? SupplyRequest::STATUS_IN_PROGRESS
                : SupplyRequest::STATUS_AWAITING_PAYMENT,
        ]);

        return back()->with(
            'success',
            "Quote set: KES {$validated['quoted_amount']}."
        );
    }

    /* ==============================================================
     | PAYMENTS
     | ============================================================== */

    /**
     * Record a manual (cash / wallet) payment.
     * Mirrors the parcel CashCodModal flow.
     */
    public function recordPayment(Request $request, SupplyRequest $supplyRequest)
    {
        if ($supplyRequest->quoted_amount === null) {
            return back()->with('error', 'Set a quote before recording a payment.');
        }

        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:' . $supplyRequest->balanceDue()],
            'channel' => [
                'required',
                Rule::in([
                    Payment::CHANNEL_CASH,
                    Payment::CHANNEL_WALLET,
                    Payment::CHANNEL_MANUAL,
                ])
            ],
            'reference' => ['nullable', 'string', 'max:255'],
        ]);

        Payment::create([
            'payable_id' => $supplyRequest->id,
            'payable_type' => SupplyRequest::class,
            'user_id' => $supplyRequest->user_id,
            'type' => Payment::TYPE_SUPPLY,
            'amount' => $validated['amount'],
            'channel' => $validated['channel'],
            'status' => Payment::STATUS_SUCCESS,
            'reference' => $validated['reference'] ?? null,
            'phone' => $supplyRequest->phone,
            'confirmed_at' => now(),
        ]);

        $this->syncSupplyStatus($supplyRequest);

        return back()->with(
            'success',
            "Payment of KES {$validated['amount']} recorded."
        );
    }

    /**
     * Initiate an M-PESA STK push for the outstanding balance.
     * Delegates to the existing M-PESA service so parcel and supply
     * STK pushes share the same code path.
     */
    public function initiateStk(Request $request, SupplyRequest $supplyRequest)
    {
        if ($supplyRequest->quoted_amount === null) {
            return back()->with('error', 'Set a quote before initiating payment.');
        }

        if ($supplyRequest->isFullyPaid()) {
            return back()->with('error', 'This request is already fully paid.');
        }

        $validated = $request->validate([
            'amount' => ['nullable', 'integer', 'min:1', 'max:' . $supplyRequest->balanceDue()],
            'phone' => ['nullable', 'string', 'regex:/^(?:254|\+254|0)?7\d{8}$/'],
        ]);

        $amount = $validated['amount'] ?? $supplyRequest->balanceDue();
        $phone = $validated['phone'] ?? $supplyRequest->phone;

        $payment = Payment::create([
            'payable_id' => $supplyRequest->id,
            'payable_type' => SupplyRequest::class,
            'user_id' => $supplyRequest->user_id,
            'type' => Payment::TYPE_SUPPLY,
            'amount' => $amount,
            'channel' => Payment::CHANNEL_MPESA,
            'status' => Payment::STATUS_PENDING,
            'phone' => $phone,
            'reference' => 'SUP-' . $supplyRequest->id . '-' . uniqid(),
        ]);

        try {
            $phone = formatPhoneNumber($phone, 0);

            app(MpesaService::class)->stkPush(
                $phone,
                $amount,
                $payment->reference,
            );
        } catch (\Throwable $e) {
            $payment->update(['status' => Payment::STATUS_FAILED]);
            report($e);
            return back()->with('error', 'Could not initiate M-PESA. Please try again.');
        }

        return back()->with('success', "M-PESA prompt sent to {$phone}.");
    }

    /**
     * After a successful payment, advance the request status.
     * Safe to call idempotently.
     */
    private function syncSupplyStatus(SupplyRequest $supply): void
    {
        $supply->refresh();

        if (
            $supply->isFullyPaid()
            && in_array($supply->status, [
                SupplyRequest::STATUS_AWAITING_PAYMENT,
                SupplyRequest::STATUS_CONFIRMED,
            ], true)
        ) {
            $supply->update(['status' => SupplyRequest::STATUS_IN_PROGRESS]);
        }
    }

    /* ==============================================================
     | STATUS / DELETE / RESTORE
     | ============================================================== */

    public function updateStatus(Request $request, SupplyRequest $supplyRequest)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(array_keys(SupplyRequest::STATUSES))],
        ]);

        // Guard: can't move to awaiting_payment without a quote.
        if (
            $validated['status'] === SupplyRequest::STATUS_AWAITING_PAYMENT
            && !$supplyRequest->quoted_amount
        ) {
            return back()->with('error', 'Set a quote before moving to awaiting payment.');
        }

        $supplyRequest->update(['status' => $validated['status']]);

        return back()->with('success', 'Status updated.');
    }

    public function destroy(SupplyRequest $supplyRequest)
    {
        $supplyRequest->delete();

        return redirect()
            ->route('admin.supply-requests.index')
            ->with('success', "Supply request #{$supplyRequest->id} deleted.");
    }

    public function restore(int $id)
    {
        $supplyRequest = SupplyRequest::withTrashed()->findOrFail($id);
        $supplyRequest->restore();

        return back()->with('success', "Supply request #{$supplyRequest->id} restored.");
    }
}