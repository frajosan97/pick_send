<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'parcel_id',
        'user_id',
        'type',
        'amount',
        'mpesa_code',
        'phone',
        'reference',
        'status',
        'confirmed_at',
    ];

    protected $casts = [
        'amount' => 'integer',
        'confirmed_at' => 'datetime',
    ];

    /* ---------- relationships ---------- */

    public function parcel(): BelongsTo
    {
        return $this->belongsTo(Parcel::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Every M-PESA attempt / confirmation tied to this payment.
     * A payment may have several (failed STK + retry, manual code claim,
     * C2B confirmation, etc.).
     */
    public function mpesaTransactions(): HasMany
    {
        return $this->hasMany(MpesaTransaction::class);
    }

    /* ---------- scopes ---------- */

    public function scopePending($q)
    {
        return $q->where('status', 'pending');
    }

    public function scopeSuccess($q)
    {
        return $q->where('status', 'success');
    }

    public function scopeFailed($q)
    {
        return $q->where('status', 'failed');
    }

    public function scopeOfType($q, string $type)
    {
        return $q->where('type', $type);
    }

    /* ---------- helpers ---------- */

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }
    public function isSuccessful(): bool
    {
        return $this->status === 'success';
    }
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    /**
     * The most recent M-PESA transaction for this payment, if any.
     * Useful for showing "last attempt" in the UI.
     */
    public function latestTransaction(): ?MpesaTransaction
    {
        return $this->mpesaTransactions()->latest()->first();
    }
}