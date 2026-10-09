<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MerchantOrder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'merchant_id',
        'parcel_id',
        'customer_name',
        'customer_phone',
        'cod_amount',
        'status',
    ];

    public function merchant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'merchant_id');
    }

    public function parcel(): BelongsTo
    {
        return $this->belongsTo(Parcel::class);
    }

    public function scopeForMerchant($q, int $id)
    {
        return $q->where('merchant_id', $id);
    }
}
