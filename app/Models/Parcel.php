<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Parcel extends Model
{
    use HasFactory, SoftDeletes;

    /* Payment option */
    public const PAYMENT_PREPAID = 'prepaid';
    public const PAYMENT_COD_FEE = 'cod_fee';
    public const PAYMENT_COD_FULL = 'cod_full';

    public const PAYMENT_OPTIONS = [
        self::PAYMENT_PREPAID,
        self::PAYMENT_COD_FEE,
        self::PAYMENT_COD_FULL,
    ];

    /* Statuses */
    public const STATUS_DRAFT = 'draft';
    public const STATUS_BOOKED = 'booked';
    public const STATUS_AWAITING_PAYMENT = 'awaiting_payment';
    public const STATUS_PAYMENT_ON_DELIVERY = 'payment_on_delivery';
    public const STATUS_PAID = 'paid';
    public const STATUS_RECEIVED = 'received';
    public const STATUS_IN_TRANSIT = 'in_transit';
    public const STATUS_AT_PICKUP = 'at_pickup';
    public const STATUS_COLLECTED = 'collected';
    public const STATUS_RETURNED = 'returned';
    public const STATUS_CANCELLED = 'cancelled';

    protected $guarded = [];

    protected $casts = [
        'estimated_worth' => 'decimal:2',
        'weight_kg' => 'decimal:2',
        'needs_packaging' => 'bool',
        'shared_drop_fee' => 'bool',
        'delivery_fee' => 'integer',
        'pack_fee' => 'integer',
        'drop_off_fee' => 'integer',
        'cod_amount' => 'integer',
        'cod_fee' => 'integer',
        'amount_due_now' => 'integer',
        'amount_paid' => 'integer',
        'total' => 'integer',
        'points_earned' => 'integer',
        'parcel_count' => 'integer',
        'paid_at' => 'datetime',
    ];

    /* -----------------------------------------------------------------
     | Relationships
     | ----------------------------------------------------------------- */

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function town(): BelongsTo
    {
        return $this->belongsTo(Town::class);
    }

    /** All collection events for this parcel (any status). */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** Only successful payments — this is "the money". */
    public function settledPayments(): HasMany
    {
        return $this->hasMany(Payment::class)->where('status', Payment::STATUS_SUCCESS);
    }

    /** Delivery-type payments (delivery fee). */
    public function deliveryPayments(): HasMany
    {
        return $this->hasMany(Payment::class)->where('type', Payment::TYPE_DELIVERY);
    }

    /** COD-type payments. */
    public function codPayments(): HasMany
    {
        return $this->hasMany(Payment::class)->where('type', Payment::TYPE_COD);
    }

    /** Any payment that is still pending (e.g. an STK in flight). */
    public function pendingPayments(): HasMany
    {
        return $this->hasMany(Payment::class)->where('status', Payment::STATUS_PENDING);
    }

    /** Event/audit log. */
    public function events(): HasMany
    {
        return $this->hasMany(ParcelEvent::class)->latest('happened_at');
    }

    /** Points awarded/consumed for this parcel. */
    public function pointLedgers(): HasMany
    {
        return $this->hasMany(PointLedger::class);
    }

    /* -----------------------------------------------------------------
     | Derived money (single source of truth = payments table)
     | ----------------------------------------------------------------- */

    public function balanceDue(): int
    {
        return max(0, (int) $this->total - (int) $this->amount_paid);
    }

    public function isPaid(): bool
    {
        return (int) $this->total > 0 && $this->balanceDue() === 0;
    }

    /**
     * True when the recipient pays something on delivery (COD).
     *
     *   cod_fee  — sender paid the delivery fee; recipient pays for goods
     *   cod_full — recipient pays delivery fee + goods
     */
    public function isCod(): bool
    {
        return in_array($this->payment_option, [
            self::PAYMENT_COD_FEE,
            self::PAYMENT_COD_FULL,
        ], true);
    }

    /**
     * True when the sender pays the delivery fee up front.
     */
    public function isPrepaid(): bool
    {
        return $this->payment_option === self::PAYMENT_PREPAID;
    }

    /**
     * Persist the parcel's paid state. MUST be called after any change to
     * its payments. Also refreshes amount_due_now, which is a stored
     * snapshot of "outstanding right now".
     */
    public function markPaidState(int $paid, bool $fullyPaid): void
    {
        $this->forceFill([
            'amount_paid' => $paid,
            'amount_due_now' => max(0, (int) $this->total - $paid),
            'paid_at' => $fullyPaid ? ($this->paid_at ?? now()) : null,
            'status' => $fullyPaid
                ? self::STATUS_PAID
                : ($this->status === self::STATUS_PAID
                    ? self::STATUS_AWAITING_PAYMENT
                    : $this->status),
        ])->save();
    }

    /* -----------------------------------------------------------------
     | Status map (for admin UI dropdowns)
     | ----------------------------------------------------------------- */

    public function statusMap(): array
    {
        return [
            self::STATUS_DRAFT => 'Draft',
            self::STATUS_BOOKED => 'Booked',
            self::STATUS_AWAITING_PAYMENT => 'Awaiting payment',
            self::STATUS_PAYMENT_ON_DELIVERY => 'Payment on delivery',
            self::STATUS_PAID => 'Paid',
            self::STATUS_RECEIVED => 'Received',
            self::STATUS_IN_TRANSIT => 'In transit',
            self::STATUS_AT_PICKUP => 'At pickup',
            self::STATUS_COLLECTED => 'Collected',
            self::STATUS_RETURNED => 'Returned',
            self::STATUS_CANCELLED => 'Cancelled',
        ];
    }

    /** Allowed transitions (used by transitionTo()). */
    public function allowedTransitions(): array
    {
        return [
            self::STATUS_DRAFT => [self::STATUS_BOOKED, self::STATUS_CANCELLED],
            self::STATUS_BOOKED => [self::STATUS_AWAITING_PAYMENT, self::STATUS_PAYMENT_ON_DELIVERY, self::STATUS_CANCELLED],
            self::STATUS_AWAITING_PAYMENT => [self::STATUS_PAID, self::STATUS_PAYMENT_ON_DELIVERY, self::STATUS_CANCELLED],
            self::STATUS_PAYMENT_ON_DELIVERY => [self::STATUS_PAID, self::STATUS_RECEIVED, self::STATUS_CANCELLED],
            self::STATUS_PAID => [self::STATUS_RECEIVED, self::STATUS_CANCELLED],
            self::STATUS_RECEIVED => [self::STATUS_IN_TRANSIT],
            self::STATUS_IN_TRANSIT => [self::STATUS_AT_PICKUP, self::STATUS_RETURNED],
            self::STATUS_AT_PICKUP => [self::STATUS_COLLECTED, self::STATUS_RETURNED],
            self::STATUS_COLLECTED => [],
            self::STATUS_RETURNED => [],
            self::STATUS_CANCELLED => [],
        ];
    }

    public function transitionTo(string $status, bool $force = false): void
    {
        if (!array_key_exists($status, $this->statusMap())) {
            throw new \InvalidArgumentException("Unknown status: {$status}");
        }

        if (!$force && !in_array($status, $this->allowedTransitions()[$this->status] ?? [], true)) {
            throw new \InvalidArgumentException(
                "Cannot transition from {$this->status} to {$status}."
            );
        }

        $this->forceFill(['status' => $status])->save();
    }
}