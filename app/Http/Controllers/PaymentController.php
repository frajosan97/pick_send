<?php

namespace App\Http\Controllers;

use App\Models\Parcel;
use App\Services\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $payments)
    {
    }

    /**
     * Manual M-PESA code submission.
     *
     * A pasted code is a CLAIM, not a confirmed payment. PaymentService
     * records it on the pending delivery payment + writes a ParcelEvent
     * for audit. Verification against Safaricom's Transaction Status API
     * happens out-of-band; only that path flips payment_confirmed.
     */
    public function confirm(Request $request, string $tracking): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'min:6', 'max:20'],
        ]);

        $parcel = Parcel::where('tracking_no', $tracking)->firstOrFail();

        $this->payments->recordMpesaCodeClaim($parcel, $validated['code']);

        // Honest flash — the code was received, not confirmed.
        return back()->with(
            'status',
            'Code received. We will verify it against M-PESA shortly and update your receipt.'
        );
    }
}