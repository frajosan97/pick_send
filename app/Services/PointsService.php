<?php

namespace App\Services;

use App\Models\Parcel;
use App\Models\PointLedger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PointsService
{
    public function awardForParcel(
        Parcel $parcel,
        int $points,
        string $reason = PointLedger::REASON_EARNED_BASE,
    ): void {
        if ($points <= 0) {
            return;
        }

        $phone = formatPhoneNumber((string) $parcel->sender_phone);

        DB::transaction(function () use ($parcel, $points, $reason, $phone) {
            // Unique (phone, parcel_id, reason) makes this idempotent.
            $inserted = PointLedger::query()->insertOrIgnore([
                'user_id' => $parcel->sender_id,
                'phone' => $phone,
                'parcel_id' => $parcel->id,
                'points' => $points,
                'reason' => $reason,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (!$inserted) {
                Log::info('Points already awarded — skipping', [
                    'parcel_id' => $parcel->id,
                    'phone' => $phone,
                    'reason' => $reason,
                ]);
                return;
            }

            // Refresh parcels.points_earned from the ledger.
            $total = PointLedger::query()
                ->where('parcel_id', $parcel->id)
                ->where('phone', $phone)
                ->earned()
                ->sum('points');

            $parcel->forceFill(['points_earned' => (int) $total])->save();
        });
    }

    public function redeem(
        string $phone,
        int $points,
        ?Parcel $parcel = null,
        ?int $userId = null,
    ): PointLedger {
        if ($points <= 0) {
            throw new \DomainException('Redemption points must be positive.');
        }

        $phone = formatPhoneNumber($phone);

        return DB::transaction(function () use ($phone, $points, $parcel, $userId) {
            $balance = PointLedger::balanceForPhone($phone);
            if ($balance < $points) {
                throw new \DomainException(
                    "Insufficient points: have {$balance}, need {$points}."
                );
            }

            return PointLedger::create([
                'user_id' => $userId ?? $parcel?->sender_id,
                'phone' => $phone,
                'parcel_id' => $parcel?->id,
                'points' => -$points,
                'reason' => PointLedger::REASON_REDEEMED,
            ]);
        });
    }
}