<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Parcel;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PdfController extends Controller
{
    public function download(Request $request, Parcel $parcel): Response
    {
        $parcel->load([
            'sender:id,name,business_name,phone',
            'recipient:id,name,phone',
            'town:id,name,route_id',
            'town.route:id,slug,name',
            'payments' => fn($q) => $q->orderByDesc('created_at'),
            'payments.mpesaTransactions' => fn($q) => $q->orderByDesc('created_at'),
            'events' => fn($q) => $q->orderByDesc('happened_at'),
            'events.staff:id,name',
        ]);

        $pdf = Pdf::loadView('reports.parcels.pdf', [
            'parcel' => $parcel,
            'mode' => 'pdf',
            'generatedAt' => now(),
        ]);

        return $pdf->download("{$parcel->tracking_no}.pdf");
    }

    public function print(Request $request, Parcel $parcel): Response
    {
        $parcel->load([
            'sender:id,name,business_name,phone',
            'recipient:id,name,phone',
            'town:id,name,route_id',
            'town.route:id,slug,name',
            'payments' => fn($q) => $q->orderByDesc('created_at'),
            'payments.mpesaTransactions' => fn($q) => $q->orderByDesc('created_at'),
            'events' => fn($q) => $q->orderByDesc('happened_at'),
            'events.staff:id,name',
        ]);

        return response()->view('reports.parcels.pdf', [
            'parcel' => $parcel,
            'mode' => 'print',
            'generatedAt' => now(),
        ]);
    }
}