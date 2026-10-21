<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use HasFactory, SoftDeletes;

    /* -----------------------------------------------------------------
     | Type  (must match the `payments.type` enum)
     | ----------------------------------------------------------------- */

    public const TYPE_DELIVERY = 'delivery';
    public const TYPE_COD = 'cod';
    public const TYPE_WITHDRAWAL = 'withdrawal';
    public const TYPE_REFUND = 'refund';
    public const TYPE_POINTS = 'points';
    public const TYPE_SUPPLY = 'supply';

    /* -----------------------------------------------------------------
     | Status  (must match the `payments.status` enum)
     | ----------------------------------------------------------------- */

    public const STATUS_PENDING = 'pending';
    public const STATUS_SUCCESS = 'success';
    public const STATUS_FAILED = 'failed';

    /* -----------------------------------------------------------------
     | Channel  (must match the `payments.channel` enum)
     | ----------------------------------------------------------------- */

    public const CHANNEL_PENDING = 'pending';
    public const CHANNEL_MPESA = 'mpesa';
    public const CHANNEL_CASH = 'cash';
    public const CHANNEL_WALLET = 'wallet';
    public const CHANNEL_MANUAL = 'manual';

    /* -----------------------------------------------------------------
     | Human labels — single source of truth for admin UIs / exports
     | ----------------------------------------------------------------- */

    public const TYPE_LABELS = [
        self::TYPE_DELIVERY => 'Delivery',
        self::TYPE_COD => 'COD',
        self::TYPE_WITHDRAWAL => 'Withdrawal',
        self::TYPE_REFUND => 'Refund',
        self::TYPE_POINTS => 'Points',
        self::TYPE_SUPPLY => 'Supply',
    ];

    public const STATUS_LABELS = [
        self::STATUS_PENDING => 'Pending',
        self::STATUS_SUCCESS => 'Success',
        self::STATUS_FAILED => 'Failed',
    ];

    public const CHANNEL_LABELS = [
        self::CHANNEL_PENDING => 'Pending',
        self::CHANNEL_MPESA => 'M-PESA',
        self::CHANNEL_CASH => 'Cash',
        self::CHANNEL_WALLET => 'Wallet',
        self::CHANNEL_MANUAL => 'Manual',
    ];

    /* -----------------------------------------------------------------
     | Attributes
     | ----------------------------------------------------------------- */

    protected $guarded = [];

    protected $casts = [
        'amount' => 'integer',
        'confirmed_at' => 'datetime',
    ];

    /* -----------------------------------------------------------------
     | Hooks — keep parcel_id ↔ payable_* in sync
     | ----------------------------------------------------------------- */

    protected static function booted(): void
    {
        static::saving(function (Payment $p) {
            // Parcel payment created via payable_id only → stamp parcel_id
            if ($p->payable_type === Parcel::class && !$p->parcel_id) {
                $p->parcel_id = $p->payable_id;
            }
            // Parcel payment created via parcel_id only → stamp payable_*
            if ($p->parcel_id && !$p->payable_id) {
                $p->payable_id = $p->parcel_id;
                $p->payable_type = Parcel::class;
            }
        });
    }

    /* -----------------------------------------------------------------
     | Relationships
     | ----------------------------------------------------------------- */

    public function payable(): MorphTo
    {
        return $this->morphTo();
    }

    public function parcel(): BelongsTo
    {
        return $this->belongsTo(Parcel::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Convenience accessor for supply payments. Only resolves when the
     * payable is a SupplyRequest; returns null otherwise.
     */
    public function supplyRequest(): BelongsTo
    {
        return $this->belongsTo(SupplyRequest::class, 'payable_id')
            ->where('payable_type', SupplyRequest::class);
    }

    /**
     * The single M-PESA transaction attached to this payment.
     *
     * The DB enforces UNIQUE(payment_id) on mpesa_transactions, so this
     * returns at most one row. `latestOfMany()` is defence-in-depth for
     * legacy data.
     */
    public function mpesaTransaction(): HasOne
    {
        return $this->hasOne(MpesaTransaction::class)->latestOfMany();
    }

    /* -----------------------------------------------------------------
     | Status helpers
     | ----------------------------------------------------------------- */

    public function isSettled(): bool
    {
        return $this->status === self::STATUS_SUCCESS;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isFailed(): bool
    {
        return $this->status === self::STATUS_FAILED;
    }

    /* -----------------------------------------------------------------
     | Payable-type helpers
     | ----------------------------------------------------------------- */

    public function isParcelPayment(): bool
    {
        return $this->payable_type === Parcel::class
            || ($this->payable_type === null && $this->parcel_id !== null);
    }

    public function isSupplyPayment(): bool
    {
        return $this->payable_type === SupplyRequest::class;
    }

    /* -----------------------------------------------------------------
     | Label helpers
     | ----------------------------------------------------------------- */

    public function typeLabel(): ?string
    {
        return self::TYPE_LABELS[$this->type] ?? null;
    }

    public function statusLabel(): ?string
    {
        return self::STATUS_LABELS[$this->status] ?? null;
    }

    public function channelLabel(): ?string
    {
        return self::CHANNEL_LABELS[$this->channel] ?? null;
    }

    /* -----------------------------------------------------------------
     | Money-source helpers
     | ----------------------------------------------------------------- */

    /**
     * True if this payment was settled via M-PESA.
     *
     * Three-tier check (cheapest first):
     *   1. denormalised `channel` column — the fast path, set by
     *      PaymentService::attachReceipt() at finalisation.
     *   2. preloaded `mpesaTransaction` relation — hit when the caller
     *      eager-loaded it (e.g. admin show, PDF view).
     *   3. linked transaction via exists() — the safety net for legacy
     *      rows whose channel was never stamped.
     */
    public function isMpesa(): bool
    {
        if ($this->channel === self::CHANNEL_MPESA) {
            return true;
        }

        if ($this->relationLoaded('mpesaTransaction')) {
            return $this->mpesaTransaction !== null;
        }

        return $this->mpesaTransaction()->exists();
    }

    /**
     * Coarse "how was this paid" label — what the UI shows.
     * Only 'mpesa' or 'cash'; wallet/manual collapse into 'cash'.
     */
    public function method(): string
    {
        return $this->isMpesa() ? 'mpesa' : 'cash';
    }

    /**
     * Human-facing receipt number, if any.
     * Fast when the relation is loaded; hits the DB otherwise.
     */
    public function receiptNumber(): ?string
    {
        if ($this->relationLoaded('mpesaTransaction')) {
            return $this->mpesaTransaction?->mpesa_receipt_number;
        }

        return $this->mpesaTransaction()->value('mpesa_receipt_number');
    }
}