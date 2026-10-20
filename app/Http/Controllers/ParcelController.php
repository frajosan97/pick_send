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

        // Prime intent only — no Payment rows yet.
        $this->payments->primeBooking($parcel, $data['payment_option']);

        $init = $this->initiatePayment($parcel, $data['payment_option']);

        $this->notifier->parcelBooked($parcel->fresh());

        $message = $init['error']
            ? "Booking created, but we couldn't send the M-PESA prompt. {$init['error']}"
            : $this->statusMessage($parcel, $init);

        return back()
            ->with('booking', [
                'parcel' => $this->booking->summary($parcel->fresh()),
                'total' => (int) $parcel->total,
                'amount_due_now' => (int) $parcel->amount_due_now,
                'amount_paid' => (int) $parcel->amount_paid,
                'payment_option' => $parcel->payment_option,
                'stk_sent' => $init['mpesa_tx'] !== null,
                'paid' => $parcel->fresh()->isPaid(),
            ])
            ->with('stk_error', $init['error'])
            ->with('status', $message)
            ->with($this->toast($init['error'] ? 'error' : 'success', $message));
    }

    public function confirmPayment(Request $request, string $tracking): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'min:6', 'max:20'],
        ]);

        $parcel = Parcel::where('tracking_no', $tracking)->firstOrFail();

        $this->payments->recordMpesaCodeClaim($parcel, $validated['code']);

        return back()
            ->with('status', 'Code received. We will verify it against M-PESA shortly and update your receipt.')
            ->with($this->toast('success', 'Code received. We will verify it against M-PESA shortly.'));
    }

    public function show(string $tracking)
    {
        $parcel = Parcel::where('tracking_no', $tracking)
            ->with(['events.staff', 'town', 'sender', 'payments.mpesaTransaction'])
            ->firstOrFail();

        return inertia('Parcel/Show', [
            'parcel' => $this->booking->summary($parcel),
        ]);
    }

    private function initiatePayment(Parcel $parcel, string $option): array
    {
        if ($option === Parcel::PAYMENT_COD_FULL) {
            return ['mpesa_tx' => null, 'error' => null];
        }

        return $this->payments->initiateForParcel($parcel, $option);
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

    private function toast(string $type, string $message): array
    {
        return ['toast' => ['type' => $type, 'message' => $message]];
    }
}