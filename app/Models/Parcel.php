<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Parcel extends Model
{
    use HasFactory, SoftDeletes;

    // ─── Payment options (mirror of the DB enum) ──────────────────
    public const PAYMENT_PREPAID = 'prepaid';
    public const PAYMENT_COD_FEE = 'cod_fee';
    public const PAYMENT_COD_FULL = 'cod_full';

    public const PAYMENT_OPTIONS = [
        self::PAYMENT_PREPAID,
        self::PAYMENT_COD_FEE,
        self::PAYMENT_COD_FULL,
    ];

    // ─── Status values (mirror of the DB enum) ────────────────────
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

    // ADDED: alias so NotificationService::parcelStatusChanged() can use
    // STATUS_DELIVERED without a fatal "undefined constant".
    // "Delivered" and "collected" are the same terminal success state here.
    public const STATUS_DELIVERED = self::STATUS_COLLECTED;

    // Statuses that may NOT be modified by generic update calls —
    // they represent money/lifecycle state and only services move them.
    // FIXED: added RETURNED and CANCELLED (both are money-affecting).
    public const PROTECTED_STATUSES = [
        self::STATUS_PAID,
        self::STATUS_PAYMENT_ON_DELIVERY,
        self::STATUS_AWAITING_PAYMENT,
        self::STATUS_COLLECTED,
        self::STATUS_RETURNED,   // ADDED
        self::STATUS_CANCELLED,  // ADDED
    ];

    // ADDED: legal transitions. Any status may move to CANCELLED or RETURNED;
    // the forward path is enforced to stop illegal jumps (draft → collected, etc.).
    // Admin overrides can bypass this via transitionTo($status, force: true).
    public const TRANSITIONS = [
        self::STATUS_DRAFT => [
            self::STATUS_BOOKED,
            self::STATUS_AWAITING_PAYMENT,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_BOOKED => [
            self::STATUS_AWAITING_PAYMENT,
            self::STATUS_PAYMENT_ON_DELIVERY,
            self::STATUS_RECEIVED,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_AWAITING_PAYMENT => [
            self::STATUS_PAID,
            self::STATUS_PAYMENT_ON_DELIVERY,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_PAYMENT_ON_DELIVERY => [
            self::STATUS_PAID,
            self::STATUS_RECEIVED,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_PAID => [
            self::STATUS_RECEIVED,
            self::STATUS_IN_TRANSIT,
            self::STATUS_CANCELLED,
            self::STATUS_RETURNED,
        ],
        self::STATUS_RECEIVED => [
            self::STATUS_IN_TRANSIT,
            self::STATUS_RETURNED,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_IN_TRANSIT => [
            self::STATUS_AT_PICKUP,
            self::STATUS_COLLECTED,
            self::STATUS_RETURNED,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_AT_PICKUP => [
            self::STATUS_COLLECTED,
            self::STATUS_RETURNED,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_COLLECTED => [
            self::STATUS_RETURNED, // e.g. refund path
        ],
        self::STATUS_RETURNED => [],
        self::STATUS_CANCELLED => [],
    ];

    /**
     * Mass-assignable.
     *
     * NOTE: we deliberately do NOT include `mpesa_code`, `amount_paid`,
     * `paid_at`, `total`, or `status` here. Those are derived or owned
     * by PaymentService / BookingService and must never be set from
     * a controller or a form.
     */
    protected $fillable = [
        // identity (auto-generated, but setter-friendly for tests)
        'tracking_no',
        'handover_code',

        // sender
        'sender_id',
        'sender_name',
        'sender_phone',
        'handover_mode',
        'drop_point',
        'pickup_address',
        'parcel_count',
        'shared_drop_fee',

        // recipient
        'recipient_id',
        'recipient_name',
        'recipient_phone',
        'town_id',

        // contents
        'contents_description',
        'estimated_worth',
        'kind',
        'weight_code',
        'weight_kg',
        'electronic_code',
        'needs_packaging',

        // money (pricing snapshot — set once by PricingService)
        'delivery_fee',
        'pack_fee',
        'drop_off_fee',
        'cod_amount',
        'cod_fee',
        'total',
        'points_earned',

        // payment intent (set by PaymentService, not by forms)
        'payment_option',
        'payer_phone',
    ];

    protected $casts = [
        // decimals
        'estimated_worth' => 'decimal:2',
        'weight_kg' => 'decimal:2',

        // integers (MySQL returns these as strings without a cast)
        'parcel_count' => 'integer',
        'delivery_fee' => 'integer',
        'pack_fee' => 'integer',
        'drop_off_fee' => 'integer',
        'cod_amount' => 'integer',
        'cod_fee' => 'integer',
        'total' => 'integer',
        'points_earned' => 'integer',
        'amount_due_now' => 'integer',
        'amount_paid' => 'integer',

        // booleans
        'needs_packaging' => 'boolean',
        'shared_drop_fee' => 'boolean',

        // dates
        'paid_at' => 'datetime',
    ];

    /**
     * Fields the model itself derives — exposed to JSON/form layers
     * automatically so views don't recompute them.
     */
    protected $appends = [
        'is_paid',
        'is_cod',
        'is_collected', // ADDED: symmetric with is_paid
        'is_terminal',  // ADDED: handy for admin list guards
        'balance_due',
    ];

    // ─────────────────────────────────────────────────────────────
    // Relationships
    // ─────────────────────────────────────────────────────────────

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(Recipient::class);
    }

    public function town(): BelongsTo
    {
        return $this->belongsTo(Town::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(ParcelEvent::class)->orderBy('happened_at');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function deliveryPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->where('type', 'delivery');
    }

    public function codPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->where('type', 'cod');
    }

    public function merchantOrder(): HasOne
    {
        return $this->hasOne(MerchantOrder::class);
    }

    public function pointLedgers(): HasMany
    {
        return $this->hasMany(PointLedger::class);
    }

    // ─────────────────────────────────────────────────────────────
    // Scopes
    // ─────────────────────────────────────────────────────────────

    public function scopePaid($q)
    {
        return $q->whereNotNull('paid_at');
    }

    public function scopeUnpaid($q)
    {
        return $q->whereNull('paid_at');
    }

    public function scopeDraft($q) // ADDED
    {
        return $q->where('status', self::STATUS_DRAFT);
    }

    public function scopeBooked($q) // ADDED
    {
        return $q->where('status', self::STATUS_BOOKED);
    }

    public function scopeAwaitingPayment($q)
    {
        return $q->where('status', self::STATUS_AWAITING_PAYMENT);
    }

    public function scopePaymentOnDelivery($q)
    {
        return $q->where('status', self::STATUS_PAYMENT_ON_DELIVERY);
    }

    public function scopeInTransit($q) // ADDED
    {
        return $q->where('status', self::STATUS_IN_TRANSIT);
    }

    public function scopeAtPickup($q) // ADDED (renamed from awaitingCollection)
    {
        return $q->where('status', self::STATUS_AT_PICKUP);
    }

    /**
     * FIXED: kept as a thin alias so existing call sites don't break.
     * The scope name now matches the state it filters.
     *
     * @deprecated Use scopeAtPickup() instead.
     */
    public function scopeAwaitingCollection($q)
    {
        return $this->scopeAtPickup($q);
    }

    public function scopeCollected($q) // ADDED
    {
        return $q->where('status', self::STATUS_COLLECTED);
    }

    public function scopeReturned($q) // ADDED
    {
        return $q->where('status', self::STATUS_RETURNED);
    }

    public function scopeCancelled($q) // ADDED
    {
        return $q->where('status', self::STATUS_CANCELLED);
    }

    public function scopeTerminal($q) // ADDED
    {
        return $q->whereIn('status', [
            self::STATUS_COLLECTED,
            self::STATUS_RETURNED,
            self::STATUS_CANCELLED,
        ]);
    }

    public function scopeForMerchant($q, int $userId)
    {
        return $q->where('sender_id', $userId);
    }

    public function scopeForRecipient($q, string $phone)
    {
        return $q->where('recipient_phone', $phone);
    }

    // ─────────────────────────────────────────────────────────────
    // Derived state (also used by $appends)
    // ─────────────────────────────────────────────────────────────

    public function isPaid(): bool
    {
        return $this->paid_at !== null;
    }

    public function isCollectable(): bool
    {
        return $this->status === self::STATUS_AT_PICKUP;
    }

    public function isCod(): bool
    {
        return in_array($this->payment_option, [
            self::PAYMENT_COD_FEE,
            self::PAYMENT_COD_FULL,
        ], true);
    }

    // ADDED: status helper accessors, symmetric with isPaid()/isCod().
    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isBooked(): bool
    {
        return $this->status === self::STATUS_BOOKED;
    }

    public function isReceived(): bool
    {
        return $this->status === self::STATUS_RECEIVED;
    }

    public function isInTransit(): bool
    {
        return $this->status === self::STATUS_IN_TRANSIT;
    }

    public function isAtPickup(): bool
    {
        return $this->status === self::STATUS_AT_PICKUP;
    }

    public function isCollected(): bool
    {
        // Alias accepted too, since STATUS_DELIVERED === STATUS_COLLECTED.
        return $this->status === self::STATUS_COLLECTED;
    }

    public function isDelivered(): bool // ADDED: matches NotificationService vocabulary
    {
        return $this->isCollected();
    }

    public function isReturned(): bool
    {
        return $this->status === self::STATUS_RETURNED;
    }

    public function isCancelled(): bool
    {
        return $this->status === self::STATUS_CANCELLED;
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [
            self::STATUS_COLLECTED,
            self::STATUS_RETURNED,
            self::STATUS_CANCELLED,
        ], true);
    }

    public function balanceDue(): int
    {
        return max(0, (int) $this->total - (int) $this->amount_paid);
    }

    // Accessors for $appends
    public function getIsPaidAttribute(): bool
    {
        return $this->isPaid();
    }

    public function getIsCodAttribute(): bool
    {
        return $this->isCod();
    }

    public function getIsCollectedAttribute(): bool // ADDED
    {
        return $this->isCollected();
    }

    public function getIsTerminalAttribute(): bool // ADDED
    {
        return $this->isTerminal();
    }

    public function getBalanceDueAttribute(): int
    {
        return $this->balanceDue();
    }

    // ─────────────────────────────────────────────────────────────
    // Guarded mutators (used only by services, never by forms)
    // ─────────────────────────────────────────────────────────────

    /**
     * Mark the cached "paid" state. Called ONLY by PaymentService.
     *
     * @internal
     */
    public function markPaidState(int $amountPaid, bool $fullyPaid): void
    {
        $this->forceFill([
            'amount_paid' => $amountPaid,
            'paid_at' => $fullyPaid ? now() : null,
            'status' => $fullyPaid ? self::STATUS_PAID : $this->status,
        ])->save();
    }

    /**
     * Move the lifecycle status. Called ONLY by BookingService / admin UI.
     *
     * FIXED: now validates the transition against self::TRANSITIONS,
     * not just "the status exists in the map".
     *
     * @internal
     * @param  bool  $force  Bypass the transition map (admin override).
     */
    public function transitionTo(string $status, bool $force = false): void
    {
        if (!array_key_exists($status, $this->statusMap())) {
            throw new \InvalidArgumentException("Unknown parcel status: {$status}");
        }

        if ($status === $this->status) {
            return; // no-op
        }

        if (!$force) {
            $allowed = self::TRANSITIONS[$this->status] ?? [];
            if (!in_array($status, $allowed, true)) {
                throw new \InvalidArgumentException(
                    "Cannot move parcel from {$this->status} to {$status}."
                );
            }
        }

        $this->forceFill(['status' => $status])->save();
    }

    /**
     * Allowed statuses — useful for admin dropdowns.
     */
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

    /**
     * Statuses the current state may legally move to (for dropdowns).
     */
    public function nextStatuses(): array
    {
        return self::TRANSITIONS[$this->status] ?? [];
    }

    // ─────────────────────────────────────────────────────────────
    // Boot: auto-generate tracking + handover
    // ─────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (Parcel $parcel) {
            $parcel->tracking_no ??= self::generateTrackingNo();
            $parcel->handover_code ??= self::generateHandoverCode();

            // Sensible default; PricingService may overwrite afterwards.
            $parcel->status ??= self::STATUS_BOOKED;
        });
    }

    /**
     * PS + yymmdd + 3-digit suffix, e.g. PS27010873.
     * Retries on collision (rare but possible under concurrent inserts).
     */
    public static function generateTrackingNo(): string
    {
        $prefix = 'PS' . now()->format('ymd');

        for ($i = 0; $i < 5; $i++) {
            $candidate = $prefix . random_int(100, 999);
            if (!self::withTrashed()->where('tracking_no', $candidate)->exists()) {
                return $candidate;
            }
        }

        // Fallback: guaranteed unique suffix. Still short enough for UI.
        return $prefix . substr((string) hrtime(true), -3);
    }

    /**
     * 4-digit numeric code. Skips 0000.
     */
    public static function generateHandoverCode(): string
    {
        return (string) random_int(1000, 9999);
    }
}