<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreParcelRequest;
use App\Models\Parcel;
use App\Services\BookingService;
use App\Services\NotificationService;
use App\Services\PricingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;

class ParcelController extends Controller
{
    public function __construct(
        private PricingService $pricing,
        private BookingService $booking,
        private NotificationService $notifier,
    ) {
    }

    public function store(StoreParcelRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $price = $this->pricing->price($data);

        $parcel = $this->booking->create($data, $price, $request->user());

        // Fire-and-forget style notifications. If you have a queue worker,
        // make NotificationService implement ShouldQueue for true async.
        $this->notifier->parcelBooked($parcel);

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