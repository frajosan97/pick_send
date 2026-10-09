<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'message_id',
        'mobile',
        'message',
        'network_id',
        'response_code',
        'response_description',
    ];

    protected $casts = [
        'response_code' => 'integer',
    ];

    /*
    |--------------------------------------------------------------------------
    | Scopes
    |--------------------------------------------------------------------------
    */

    public function scopeSuccessful($query)
    {
        return $query->where('response_code', 200);
    }

    public function scopeFailed($query)
    {
        return $query->where('response_code', '!=', 200)
            ->orWhereNull('response_code');
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function isSuccessful(): bool
    {
        return $this->response_code === 200;
    }
}