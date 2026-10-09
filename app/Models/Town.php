<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Town extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'route_id',
        'name',
        'is_satellite',
        'satellite_fee',
        'is_active',
    ];

    protected $casts = [
        'is_satellite' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function route(): BelongsTo
    {
        return $this->belongsTo(Route::class);
    }

    public function parcels(): HasMany
    {
        return $this->hasMany(Parcel::class);
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(Recipient::class);
    }

    public function supplyRequests(): HasMany
    {
        return $this->hasMany(SupplyRequest::class);
    }

    public function scopeActive($q)
    {
        return $q->where('is_active', true);
    }

    public function scopeSatellites($q)
    {
        return $q->where('is_satellite', true);
    }
}
