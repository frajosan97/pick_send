<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Transport-layer record for a single M-PESA request.
 *
 * Backed by `mpesa_transactions` (the FelixMuhoro\Mpesa package's table,
 * overridable via config('mpesa.database.table')).
 *
 * Because the package also writes to this table, we:
 *   - tag our own rows with type='stk';
 *   - always filter by type='stk' when we mean "our STK pushes";
 *   - never delete rows (mark failed/completed instead);
 *   - never assume we own the whole table.
 *
 * Relation to payments:
 *   One payment → many mpesa_transactions (retries, manual claims, C2B).
 *   The FK lives here (`payment_id`), not on payments.
 */
class MpesaTransaction extends Model
{
    protected $table;

    protected $fillable = [
        'payment_id',
        'merchant_request_id',
        'checkout_request_id',
        'mpesa_receipt_number',
        'phone',
        'amount',
        'reference',
        'description',
        'status',
        'result_code',
        'result_desc',
        'type',
        'request_payload',
        'callback_payload',
        'payer_type',
        'payer_id',
        'completed_at',
    ];

    protected $casts = [
        'amount' => 'integer',
        'request_payload' => 'array',
        'callback_payload' => 'array',
        'completed_at' => 'datetime',
    ];

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);

        $this->table = config('mpesa.database.table', 'mpesa_transactions');
    }

    /* ---------- relationships ---------- */

    /**
     * The payment this M-PESA attempt/confirmation belongs to.
     *
     * Nullable: unsolicited C2B confirmations, B2C reversals, or the
     * very first STK push that failed before a Payment row was created
     * may exist without a payment. PaymentService back-fills it once
     * the transaction is matched.
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function payer(): MorphTo
    {
        return $this->morphTo();
    }

    /* ---------- scopes ---------- */

    public function scopePending($q)
    {
        return $q->where('status', 'pending');
    }

    public function scopeCompleted($q)
    {
        return $q->where('status', 'completed');
    }

    public function scopeFailed($q)
    {
        return $q->where('status', 'failed');
    }

    public function scopeStk($q)
    {
        return $q->where('type', 'stk');
    }

    /**
     * Only transactions already linked to a payment.
     */
    public function scopeLinked($q)
    {
        return $q->whereNotNull('payment_id');
    }

    /* ---------- helpers ---------- */

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    public function isLinked(): bool
    {
        return $this->payment_id !== null;
    }
}