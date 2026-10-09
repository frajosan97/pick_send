<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSupplyRequest;
use App\Models\SupplyRequest;
use App\Models\Town;
use App\Services\SupplyService;
use Illuminate\Http\RedirectResponse;

class SupplyRequestController extends Controller
{
    public function __construct(private SupplyService $supply) {}

    public function store(StoreSupplyRequest $request): RedirectResponse
    {
        [$route, $townName] = array_pad(explode('|', $request->town), 2, null);

        $town = Town::where('name', $townName)->firstOrFail();

        $supply = SupplyRequest::create([
            'user_id' => $request->user()?->id,
            'name' => $request->name,
            'phone' => $request->phone,
            'town_id' => $town->id,
            'what' => $request->what,
            'pickup_from' => $request->from,
            'supplier_phone' => $request->sphone,
            'frequency' => $request->often,
        ]);

        return back()->with('supply', [
            'id' => $supply->id,
            'text' => $this->supply->waText($supply),
            'waHref' => $this->supply->waHref($supply),
        ]);
    }
}
