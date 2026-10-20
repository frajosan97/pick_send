<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointLedger extends Model
{
    use HasFactory;

    /* ---------------------------------------------------------------
     | Reasons
     |
     | One row per (phone, parcel_id, reason) — enforced by the DB
     | unique index. Each reason is a distinct "slot" per parcel, so
     | a parcel can earn base + bonus, then be redeemed and expired
     | independently without colliding.
     | --------------------------------------------------------------- */

    public const REASON_EARNED_BASE = 'earned';
    public const REASON_EARNED_BONUS = 'earned_bonus';
    public const REASON_REDEEMED = 'redeemed';
    public const REASON_EXPIRED = 'expired';
    public const REASON_REVERSED = 'reversed';

    public const REASONS = [
        self::REASON_EARNED_BASE,
        self::REASON_EARNED_BONUS,
        self::REASON_REDEEMED,
        self::REASON_EXPIRED,
        self::REASON_REVERSED,
    ];

    protected $guarded = [];

    protected $casts = [
        'points' => 'integer',
    ];

    /* ---------------------------------------------------------------
     | Relationships
     | --------------------------------------------------------------- */

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parcel(): BelongsTo
    {
        return $this->belongsTo(Parcel::class);
    }

    /* ---------------------------------------------------------------
     | Scopes
     | --------------------------------------------------------------- */

    public function scopeEarned(Builder $q): Builder
    {
        return $q->whereIn('reason', [
            self::REASON_EARNED_BASE,
            self::REASON_EARNED_BONUS,
        ]);
    }

    public function scopeRedeemed(Builder $q): Builder
    {
        return $q->where('reason', self::REASON_REDEEMED);
    }

    public function scopeForPhone(Builder $q, string $phone): Builder
    {
        return $q->where('phone', formatPhoneNumber($phone));
    }

    /* ---------------------------------------------------------------
     | Helpers
     | --------------------------------------------------------------- */

    public static function balanceForPhone(string $phone): int
    {
        return (int) static::query()
            ->forPhone($phone)
            ->sum('points');
    }

    public static function earnedForParcel(Parcel $parcel, string $phone): int
    {
        return (int) static::query()
            ->where('parcel_id', $parcel->id)
            ->forPhone($phone)
            ->earned()
            ->sum('points');
    }
}