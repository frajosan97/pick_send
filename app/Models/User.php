<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string|null $phone
 * @property Carbon|null $phone_verified_at
 * @property string|null $business_name
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
#[Fillable(['name', 'email', 'phone', 'business_name', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable, HasRoles, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /* ---------- relationships ---------- */
    public function wallet(): HasOne
    {
        return $this->hasOne(Wallet::class);
    }

    public function sentParcels(): HasMany
    {
        return $this->hasMany(Parcel::class, 'sender_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(Recipient::class);
    }

    public function pointLedgers(): HasMany
    {
        return $this->hasMany(PointLedger::class);
    }

    public function supplyRequests(): HasMany
    {
        return $this->hasMany(SupplyRequest::class);
    }

    public function merchantOrders(): HasMany
    {
        return $this->hasMany(MerchantOrder::class, 'merchant_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function parcelEvents(): HasMany
    {
        return $this->hasMany(ParcelEvent::class, 'staff_id');
    }

    /* ---------- role helpers (thin wrappers over Spatie) ---------- */
    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function isMerchant(): bool
    {
        return $this->hasRole('merchant');
    }

    public function isStaff(): bool
    {
        return $this->hasRole('staff');
    }

    public function isCustomer(): bool
    {
        return $this->hasRole('customer');
    }

    /* ---------- helpers ---------- */
    public function walletOrCreate(): Wallet
    {
        return $this->wallet()->firstOrCreate([], ['balance' => 0]);
    }

    public function supplyRequestMasters(): HasMany
    {
        return $this->hasMany(SupplyRequest::class)
            ->where('recurring', true)
            ->whereNull('parent_id');
    }
}