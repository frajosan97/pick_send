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

    protected $fillable = [
        'tracking_no',
        'handover_code',
        'sender_id',
        'sender_name',
        'sender_phone',
        'handover_mode',
        'drop_point',
        'pickup_address',
        'parcel_count',
        'shared_drop_fee',
        'recipient_id',
        'recipient_name',
        'recipient_phone',
        'town_id',
        'contents_description',
        'estimated_worth',
        'kind',
        'weight_code',
        'weight_kg',
        'electronic_code',
        'needs_packaging',
        'delivery_fee',
        'pack_fee',
        'drop_off_fee',
        'cod_amount',
        'cod_fee',
        'total',
        'points_earned',
        'payer_phone',
        'mpesa_code',
        'paid_at',
        'status',
    ];

    protected $casts = [
        'estimated_worth' => 'decimal:2',
        'weight_kg' => 'decimal:2',
        'needs_packaging' => 'boolean',
        'shared_drop_fee' => 'boolean',
        'paid_at' => 'datetime',
    ];

    /* ---------- relationships ---------- */
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

    public function merchantOrder(): HasOne
    {
        return $this->hasOne(MerchantOrder::class);
    }

    public function pointLedgers(): HasMany
    {
        return $this->hasMany(PointLedger::class);
    }

    /* ---------- scopes ---------- */
    public function scopePaid($q)
    {
        return $q->whereNotNull('paid_at');
    }

    public function scopeAwaitingCollection($q)
    {
        return $q->where('status', 'at_pickup');
    }

    public function scopeForMerchant($q, int $id)
    {
        return $q->where('sender_id', $id);
    }

    /* ---------- helpers ---------- */
    public function isPaid(): bool
    {
        return ! is_null($this->paid_at);
    }

    public function isCollectable(): bool
    {
        return $this->status === 'at_pickup';
    }

    /* ---------- boot: auto-generate tracking + handover ---------- */
    protected static function booted(): void
    {
        static::creating(function (Parcel $parcel) {
            $parcel->tracking_no ??= self::generateTrackingNo();
            $parcel->handover_code ??= (string) random_int(1000, 9999);
        });
    }

    public static function generateTrackingNo(): string
    {
        do {
            $no = 'PS'.now()->format('ymd').random_int(100, 999);
        } while (self::withTrashed()->where('tracking_no', $no)->exists());

        return $no;
    }
}
