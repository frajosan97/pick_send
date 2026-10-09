<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PricingConstant extends Model
{
    protected $fillable = [
        'key',
        'value',
        'description',
    ];

    protected $casts = [
        'value' => 'decimal:2',
    ];

    public static function get(string $key, $default = null)
    {
        return static::where('key', $key)->value('value') ?? $default;
    }
}
