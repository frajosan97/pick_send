<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GeneralPrice extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'code',
        'label',
        'price',
        'packaging',
        'pickup_fee',
        'per_kg',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'per_kg' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function scopeActive($q)
    {
        return $q->where('is_active', true)->orderBy('sort_order');
    }
}
