<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreParcelRequest;
use App\Models\Parcel;
use App\Services\BookingService;
use App\Services\PricingService;
use Illuminate\Http\RedirectResponse;

class ParcelController extends Controller
{
    public function __construct(
        private PricingService $pricing,
        private BookingService $booking,
    ) {}

    public function store(StoreParcelRequest $request): RedirectResponse
    {
        // 1. Compute the authoritative price server-side
        $data = $request->validated();
        $price = $this->pricing->price($data);

        // 2. Create the parcel + first event + payment row in a transaction
        $parcel = $this->booking->create($data, $price, $request->user());

        // 3. Return to the page with the created parcel for the receipt UI
        return back()->with('booking', [
            'tracking_no' => $parcel->tracking_no,
            'handover_code' => $parcel->handover_code,
            'total' => $parcel->total,
            'receipt' => $this->booking->receiptText($parcel),
            'receiptHref' => $this->booking->receiptHref($parcel),
            'bookingHref' => $this->booking->bookingHref($parcel),
            'custHref' => $this->booking->custHref($parcel),
            'who' => $this->booking->who($parcel),
            'rows' => $this->booking->receiptRows($parcel),
            'paid' => $parcel->isPaid(),
        ]);
    }

    public function show(string $tracking)
    {
        $parcel = Parcel::where('tracking_no', $tracking)
            ->with(['events', 'town', 'sender'])
            ->firstOrFail();

        return inertia('Parcel/Show', ['parcel' => $parcel]);
    }
}
