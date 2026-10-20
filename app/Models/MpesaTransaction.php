<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
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
 */
class MpesaTransaction extends Model
{
    /**
     * Resolved from config in the constructor so the package's env
     * override (MPESA_DB_TABLE) is honoured.
     */
    protected $table;

    protected $fillable = [
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
}