<?php

namespace App\Http\Controllers;

use App\Models\Parcel;
use App\Services\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(private PaymentService $payments) {}

    public function confirm(Request $request, Parcel $parcel): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'min:6', 'max:20'],
        ]);

        $this->payments->recordMpesaCode($parcel, $request->code);

        return back()->with('payment_confirmed', true);
    }
}
