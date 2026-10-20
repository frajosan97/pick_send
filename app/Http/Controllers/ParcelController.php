<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreParcelRequest;
use App\Models\Parcel;
use App\Services\BookingService;
use App\Services\NotificationService;
use App\Services\PaymentService;
use App\Services\PricingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ParcelController extends Controller
{
    public function __construct(
        private PricingService $pricing,
        private BookingService $booking,
        private NotificationService $notifier,
        private PaymentService $payments,
    ) {
    }

    public function store(StoreParcelRequest $request): RedirectResponse
    {
        $data = $request->payload();
        $price = $this->pricing->price($data);

        $parcel = DB::transaction(function () use ($data, $price, $request) {
            return $this->booking->create($data, $price, $request->user());
        });

        $init = $this->payments->initiateForParcel(
            parcel: $parcel,
            option: $data['payment_option'],
        );

        $this->notifier->parcelBooked($parcel->fresh());

        return back()
            ->with('booking', [
                'parcel' => $this->booking->summary($parcel),
                'total' => (int) $parcel->total,
                'amount_due_now' => (int) $parcel->amount_due_now,
                'amount_paid' => (int) $parcel->amount_paid,
                'payment_option' => $parcel->payment_option,
                'stk_sent' => $init['mpesa_tx'] !== null,
                'paid' => $parcel->isPaid(),
            ])
            ->with('stk_error', $init['error'])
            ->with('status', $this->statusMessage($parcel, $init));
    }

    /**
     * Manual fallback: recipient pays via Paybill and pastes the code.
     *
     * The controller does NOT touch payments directly. A user-typed
     * code is a claim, not proof — PaymentService records it via
     * recordMpesaCodeClaim(), which is the ONLY method that writes to
     * payments from user input, and which also writes a ParcelEvent
     * so the timeline shows the claim.
     *
     * Verification against Safaricom's Transaction Status API happens
     * out-of-band; only a verified match calls markPaymentSuccess().
     */
    public function confirmPayment(Request $request, string $tracking): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'min:6', 'max:20'],
        ]);

        $parcel = Parcel::where('tracking_no', $tracking)->firstOrFail();

        $this->payments->recordMpesaCodeClaim($parcel, $validated['code']);

        return back()->with(
            'status',
            'Code received. We will verify it against M-PESA shortly and update your receipt.'
        );
    }

    public function show(string $tracking)
    {
        $parcel = Parcel::where('tracking_no', $tracking)
            ->with(['events', 'town', 'sender', 'payments'])
            ->firstOrFail();

        return inertia('Parcel/Show', [
            'parcel' => $this->booking->summary($parcel),
        ]);
    }

    private function statusMessage(Parcel $parcel, array $init): string
    {
        if ($init['error']) {
            return $init['error'];
        }

        return match ($parcel->payment_option) {
            Parcel::PAYMENT_PREPAID => 'Booking created. We sent an M-PESA prompt to your phone — enter your PIN to pay.',
            Parcel::PAYMENT_COD_FEE => 'Booking created. We sent an M-PESA prompt for the delivery fee. The recipient pays for the goods on delivery.',
            Parcel::PAYMENT_COD_FULL => 'Booking created. The recipient will pay the full amount on delivery.',
            default => 'Booking created.',
        };
    }
}