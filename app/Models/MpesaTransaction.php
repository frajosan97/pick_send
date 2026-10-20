<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class MpesaTransaction extends Model
{
    use HasFactory;

    /* Type */
    public const TYPE_STK = 'stk';
    public const TYPE_C2B = 'c2b';
    public const TYPE_B2C = 'b2c';
    public const TYPE_REVERSAL = 'reversal';

    /* Status */
    public const STATUS_PENDING = 'pending';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    protected $guarded = [];

    protected $casts = [
        'amount' => 'integer',
        'request_payload' => 'array',
        'callback_payload' => 'array',
        'completed_at' => 'datetime',
    ];

    /* -----------------------------------------------------------------
     | Relationships
     | ----------------------------------------------------------------- */

    /**
     * The payment this receipt settles. NULL until reconciled.
     * DB: UNIQUE(payment_id) — a payment can only ever receive one tx.
     */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /** The payer entity (user, parcel, etc.) when known. */
    public function payer(): MorphTo
    {
        return $this->morphTo();
    }

    /* -----------------------------------------------------------------
     | Scopes
     | ----------------------------------------------------------------- */

    public function scopeStk(Builder $q): Builder
    {
        return $q->where('type', self::TYPE_STK);
    }

    public function scopeC2b(Builder $q): Builder
    {
        return $q->where('type', self::TYPE_C2B);
    }

    public function scopePending(Builder $q): Builder
    {
        return $q->where('status', self::STATUS_PENDING);
    }

    public function scopeCompleted(Builder $q): Builder
    {
        return $q->where('status', self::STATUS_COMPLETED);
    }

    public function scopeOrphan(Builder $q): Builder
    {
        return $q->whereNull('payment_id');
    }

    /* -----------------------------------------------------------------
     | Helpers
     | ----------------------------------------------------------------- */

    public function isOrphan(): bool
    {
        return $this->payment_id === null;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }

    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }
}