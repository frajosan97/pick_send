<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParcelEvent extends Model
{
    use HasFactory;

    /**
     * `status` is intentionally free-text: it holds parcel lifecycle
     * statuses AND event-only statuses like:
     *
     *   - 'payment'          — money received (STK / C2B / cash / reconcile)
     *   - 'payment_claim'    — user typed an M-PESA code for verification
     *   - 'admin_override'   — admin marked paid manually
     *   - 'admin_link'       — admin reconciled an orphan M-PESA receipt
     *
     * Keep as string; do NOT convert to enum tied to Parcel::STATUS_*.
     */

    protected $guarded = [];

    protected $casts = [
        'happened_at' => 'datetime',
    ];

    /* -----------------------------------------------------------------
     | Relationships
     | ----------------------------------------------------------------- */

    public function parcel(): BelongsTo
    {
        return $this->belongsTo(Parcel::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}