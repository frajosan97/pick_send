<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSupplyRequest;
use App\Models\SupplyRequest;
use App\Models\Town;
use App\Services\SupplyService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SupplyRequestController extends Controller
{
    public function __construct(private SupplyService $supply)
    {
    }

    public function store(StoreSupplyRequest $request): RedirectResponse
    {
        // "mount|Nyeri" — split into route + name. If the prefix is
        // missing, treat the whole string as the town name.
        $rawTown = trim((string) $request->input('town'));
        $townName = Str::contains($rawTown, '|')
            ? trim(Str::after($rawTown, '|'))
            : $rawTown;

        $town = Town::query()
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($townName)])
            ->first();

        if (!$town) {
            throw ValidationException::withMessages([
                'town' => 'We don\'t deliver to that town yet. Please pick another.',
            ]);
        }

        // Link the user only if present and NOT soft-deleted.
        $user = $request->user();
        $userId = ($user && !$user->trashed()) ? $user->id : null;

        $frequency = $request->often; // already lowercase
        $isRecurring = $frequency !== SupplyRequest::FREQ_ONCE;

        $supply = SupplyRequest::create([
            'parent_id' => null,               // master row
            'scheduled_for' => null,               // set on clones only
            'recurring' => $isRecurring,       // drives the scheduler
            'user_id' => $userId,
            'name' => $request->name,
            'phone' => $request->phone,
            'town_id' => $town->id,
            'what' => $request->what,
            'pickup_from' => $request->input('from'),
            'supplier_phone' => $request->sphone,
            'frequency' => $frequency,
            'quoted_amount' => null,
            'quoted_at' => null,
            'status' => SupplyRequest::STATUS_PENDING,
        ]);

        return back()->with('supply', [
            'id' => $supply->id,
            'text' => $this->supply->waText($supply),
            'waHref' => $this->supply->waHref($supply),
        ]);
    }
}