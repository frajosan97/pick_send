<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int|null $parent_id
 * @property Carbon|null $scheduled_for
 * @property bool $recurring
 * @property int|null $user_id
 * @property string $name
 * @property string $phone
 * @property int $town_id
 * @property string $what
 * @property string $pickup_from
 * @property string|null $supplier_phone
 * @property string $frequency
 * @property int|null $quoted_amount
 * @property Carbon|null $quoted_at
 * @property string $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 */
class SupplyRequest extends Model
{
    use HasFactory, SoftDeletes;

    /* ---------------------------------------------------------------
     | Statuses — must match the migration's enum:
     |   pending, confirmed, awaiting_payment, in_progress, done, cancelled
     | --------------------------------------------------------------- */

    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_AWAITING_PAYMENT = 'awaiting_payment';
    public const STATUS_IN_PROGRESS = 'in_progress';
    public const STATUS_DONE = 'done';
    public const STATUS_CANCELLED = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING => 'Pending',
        self::STATUS_CONFIRMED => 'Confirmed',
        self::STATUS_AWAITING_PAYMENT => 'Awaiting payment',
        self::STATUS_IN_PROGRESS => 'In progress',
        self::STATUS_DONE => 'Done',
        self::STATUS_CANCELLED => 'Cancelled',
    ];

    /* ---------------------------------------------------------------
     | Frequencies — must match the migration's enum:
     |   once, daily, weekly, monthly  (lowercase)
     | --------------------------------------------------------------- */

    public const FREQ_ONCE = 'once';
    public const FREQ_DAILY = 'daily';
    public const FREQ_WEEKLY = 'weekly';
    public const FREQ_MONTHLY = 'monthly';

    public const FREQUENCIES = [
        self::FREQ_ONCE => 'Once',
        self::FREQ_DAILY => 'Daily',
        self::FREQ_WEEKLY => 'Weekly',
        self::FREQ_MONTHLY => 'Monthly',
    ];

    /* ---------------------------------------------------------------
     | Config
     | --------------------------------------------------------------- */

    protected $fillable = [
        'parent_id',
        'scheduled_for',
        'recurring',
        'user_id',
        'name',
        'phone',
        'town_id',
        'what',
        'pickup_from',
        'supplier_phone',
        'frequency',
        'quoted_amount',
        'quoted_at',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'parent_id' => 'integer',
            'user_id' => 'integer',
            'town_id' => 'integer',
            'quoted_amount' => 'integer',
            'recurring' => 'boolean',
            'scheduled_for' => 'date',
            'quoted_at' => 'datetime',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
            'deleted_at' => 'datetime',
        ];
    }

    /* ---------------------------------------------------------------
     | Relationships
     | --------------------------------------------------------------- */

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function town(): BelongsTo
    {
        return $this->belongsTo(Town::class);
    }

    public function payments(): MorphMany
    {
        return $this->morphMany(Payment::class, 'payable');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function occurrences(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /* ---------------------------------------------------------------
     | Scopes
     | --------------------------------------------------------------- */

    public function scopeStatus(Builder $q, string $status): Builder
    {
        return $q->where('status', $status);
    }

    public function scopeOpen(Builder $q): Builder
    {
        return $q->whereIn('status', [
            self::STATUS_PENDING,
            self::STATUS_CONFIRMED,
            self::STATUS_AWAITING_PAYMENT,
            self::STATUS_IN_PROGRESS,
        ]);
    }

    public function scopeFrequency(Builder $q, string $frequency): Builder
    {
        return $q->where('frequency', $frequency);
    }

    public function scopeMasters(Builder $q): Builder
    {
        return $q->where('recurring', true)->whereNull('parent_id');
    }

    public function scopeDueOn(Builder $q, Carbon $date): Builder
    {
        return $q->whereDate('scheduled_for', $date->toDateString());
    }

    /* ---------------------------------------------------------------
     | Helpers
     | --------------------------------------------------------------- */

    public function isOpen(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING,
            self::STATUS_CONFIRMED,
            self::STATUS_AWAITING_PAYMENT,
            self::STATUS_IN_PROGRESS,
        ], true);
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [
            self::STATUS_DONE,
            self::STATUS_CANCELLED,
        ], true);
    }

    public function amountPaid(): int
    {
        return (int) $this->payments()
            ->where('status', Payment::STATUS_SUCCESS)
            ->sum('amount');
    }

    public function balanceDue(): int
    {
        if ($this->quoted_amount === null) {
            return 0;
        }

        return max(0, $this->quoted_amount - $this->amountPaid());
    }

    public function isFullyPaid(): bool
    {
        return $this->quoted_amount !== null && $this->balanceDue() === 0;
    }

    /* ---------------------------------------------------------------
     | Validation rules (shared between controllers/form requests)
     | town_id and pickup_from are NOT NULL in the migration,
     | so they must be required here too.
     | --------------------------------------------------------------- */

    public static function rules(bool $isUpdate = false): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'town_id' => ['required', 'integer', 'exists:towns,id'],
            'what' => ['required', 'string', 'max:1000'],
            'pickup_from' => ['required', 'string', 'max:255'],
            'supplier_phone' => ['nullable', 'string', 'max:20'],
            'frequency' => ['required', 'in:' . implode(',', array_keys(self::FREQUENCIES))],
            'status' => $isUpdate
                ? ['required', 'in:' . implode(',', array_keys(self::STATUSES))]
                : ['nullable', 'in:' . implode(',', array_keys(self::STATUSES))],
        ];
    }
}