<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Wallet extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'balance',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class)->latest();
    }

    /** Credit or debit atomically. Signed amount. */
    public function move(int $amount, string $type, ?string $ref = null, ?string $note = null): WalletTransaction
    {
        return DB::transaction(function () use ($amount, $type, $ref, $note) {
            $wallet = self::whereKey($this->id)->lockForUpdate()->first();
            $wallet->balance += $amount;
            $wallet->save();

            return $wallet->transactions()->create([
                'type' => $type,
                'amount' => $amount,
                'balance_after' => $wallet->balance,
                'reference' => $ref,
                'note' => $note,
            ]);
        });
    }

    public function credit(int $amount, string $type, ?string $ref = null, ?string $note = null): WalletTransaction
    {
        return $this->move(abs($amount), $type, $ref, $note);
    }

    public function debit(int $amount, string $type, ?string $ref = null, ?string $note = null): WalletTransaction
    {
        return $this->move(-abs($amount), $type, $ref, $note);
    }
}
