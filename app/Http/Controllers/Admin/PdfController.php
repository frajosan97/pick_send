<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Parcel;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PdfController extends Controller
{
    /**
     * Relationships required by reports/parcels/pdf.blade.php.
     *
     * NOTE: `payments.mpesaTransaction` is singular — one receipt max per
     * payment, enforced at DB level (UNIQUE(payment_id)).
     */
    private function payload(Parcel $parcel, string $mode): array
    {
        $parcel->load([
            'sender:id,name,business_name,phone',
            'recipient:id,name,phone',
            'town:id,name,route_id',
            'town.route:id,slug,name',
            'payments' => fn($q) => $q->orderByDesc('created_at'),
            'payments.mpesaTransaction',       // singular — one receipt max
            'events' => fn($q) => $q->orderByDesc('happened_at'),
            'events.staff:id,name',
        ]);

        return [
            'parcel' => $parcel,
            'mode' => $mode,
            'generatedAt' => now(),
        ];
    }

    public function download(Request $request, Parcel $parcel): Response
    {
        $pdf = Pdf::loadView('reports.parcels.pdf', $this->payload($parcel, 'pdf'));

        return $pdf->download("{$parcel->tracking_no}.pdf");
    }

    public function print(Request $request, Parcel $parcel): Response
    {
        return response()->view('reports.parcels.pdf', $this->payload($parcel, 'print'));
    }
}