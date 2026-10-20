<?php

namespace App\Http\Controllers;

use App\Models\Parcel;
use Illuminate\Http\JsonResponse;

class TrackingController extends Controller
{
    public function show(string $tracking): JsonResponse
    {
        $parcel = Parcel::where('tracking_no', $tracking)
            ->with(['events', 'town'])
            ->first();

        if (!$parcel) {
            return response()->json(['error' => 'not_found'], 404);
        }

        return response()->json([
            'tracking_no' => $parcel->tracking_no,
            'status' => $parcel->status,
            'town' => $parcel->town->name,
            'recipient_name' => $parcel->recipient_name,
            'cod_amount' => $parcel->cod_amount,
            'events' => $parcel->events->map(fn($e) => [
                'label' => $e->label,
                'description' => $e->description,
                'happened_at' => $e->happened_at->toIso8601String(),
            ]),
        ]);
    }
}
