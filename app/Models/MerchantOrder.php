<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MerchantOrder extends Model
{
    use SoftDeletes;

    /**
     * merchant_id — who owns the ledger row
     * parcel_id   — which parcel it points at
     *
     * Everything else (customer_name, cod_amount, status, …) is read
     * from the parcel via ->parcel — no duplication, no drift.
     */
    protected $fillable = [
        'merchant_id',
        'parcel_id',
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