<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PointLedger extends Model
{
    protected $fillable = [
        'user_id',
        'phone',
        'parcel_id',
        'points',
        'reason',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parcel(): BelongsTo
    {
        return $this->belongsTo(Parcel::class);
    }

    public static function balanceFor(string $phone): int
    {
        return (int) static::where('phone', $phone)->sum('points');
    }
}
