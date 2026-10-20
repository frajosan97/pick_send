<?php

// app/Services/PricingService.php

namespace App\Services;

use App\Models\Faq;
use App\Models\GeneralPrice;
use App\Models\ItemGroup;
use App\Models\PricingConstant;
use App\Models\Route;
use App\Models\Town;
use Illuminate\Support\Facades\Cache;

class PricingService
{
    private const CACHE_KEY = 'picksend.config.v1';

    private const TTL = 3600;

    /** In-request memo of the config, so price()/breakdown() don't rebuild it. */
    private ?array $config = null;

    /* =================================================================
     |  CONFIG
     * =================================================================*/

    public function buildConfig(): array
    {
        if ($this->config !== null) {
            return $this->config;
        }

        return $this->config = Cache::remember(
            self::CACHE_KEY,
            self::TTL,
            fn() => [
                'constants' => $this->constants(),
                'routes' => $this->routes(),
                'towns' => $this->towns(),
                'satellites' => $this->satellites(),
                'general' => $this->general(),
                'elec' => $this->elec(),
                'faq' => $this->faq(),
            ]
        );
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /** Useful in long-running tests / queue workers. */
    public function refresh(): void
    {
        self::flush();
        $this->config = null;
    }

    /* ----------------------------------------------------------------- */

    private function constants(): array
    {
        $c = PricingConstant::pluck('value', 'key');

        return [
            'base10' => (float) ($c['base10'] ?? 449),
            'perKg' => (float) ($c['per_kg'] ?? 20),
            'maxKg' => (int) ($c['max_kg'] ?? 50),
            'codFeeRate' => (float) ($c['cod_fee_rate'] ?? 0.016),
            'pointsRate' => (float) ($c['points_rate'] ?? 0.02),
            'pointsValue' => (float) ($c['points_value'] ?? 1),
            'pointsMin' => (int) ($c['points_min'] ?? 100),
            'returnDays' => (int) ($c['return_days'] ?? 7),
            'dropOffFee' => (int) ($c['drop_off_fee'] ?? 100),
        ];
    }

    private function routes(): array
    {
        return Route::active()
            ->where('slug', '!=', 'nairobi')
            ->orderBy('sort_order')
            ->pluck('name', 'slug')
            ->all();
    }

    private function towns(): array
    {
        return Route::active()
            ->where('slug', '!=', 'nairobi')
            ->with([
                'towns' => fn($q) => $q
                    ->where('is_satellite', false)
                    ->where('is_active', true)
                    ->orderBy('sort_order')
                    ->select('id', 'route_id', 'name', 'sort_order'),
            ])
            ->orderBy('sort_order')
            ->get()
            ->map(fn(Route $r) => [$r->slug, $r->towns->pluck('name')->all()])
            ->all();
    }

    private function satellites(): array
    {
        return Town::satellites()->active()->orderBy('sort_order')->pluck('name')->all();
    }

    private function general(): array
    {
        return GeneralPrice::active()->orderBy('sort_order')->get()
            ->map(fn($g) => [
                'id' => $g->code,
                'label' => $g->label,
                'p' => (int) $g->price,
                'pack' => (int) $g->packaging,
                'pu' => (int) $g->pickup_fee,
                'perKg' => $g->per_kg ? true : null,
            ])
            ->all();
    }

    private function elec(): array
    {
        return ItemGroup::active()
            ->with([
                'items' => fn($q) => $q
                    ->where('is_active', true)
                    ->orderBy('sort_order'),
            ])
            ->orderBy('sort_order')
            ->get()
            ->map(fn(ItemGroup $g) => [
                'group' => $g->name,
                'items' => $g->items->map(fn($i) => [
                    'id' => $i->code,
                    'label' => $i->label,
                    'p' => (int) $i->price,
                    'pack' => (int) $i->packaging,
                    'pu' => (int) $i->pickup_fee,
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }

    private function faq(): array
    {
        return Faq::published()->get(['question', 'answer'])
            ->map(fn($f) => [$f->question, $f->answer])
            ->all();
    }

    /* =================================================================
     |  LOOKUPS (shared between price() and breakdown())
     * =================================================================*/

    /** Find an electronic item by its code, or null. */
    private function findItem(string $code): ?array
    {
        foreach ($this->buildConfig()['elec'] as $g) {
            foreach ($g['items'] as $row) {
                if ($row['id'] === $code) {
                    return $row;
                }
            }
        }

        return null;
    }

    /** Find a general tier by its code, or null. */
    private function findTier(string $code): ?array
    {
        foreach ($this->buildConfig()['general'] as $row) {
            if ($row['id'] === $code) {
                return $row;
            }
        }

        return null;
    }

    /* =================================================================
     |  PRICE  — mirror of frontend `price(f)`
     * =================================================================*/

    public function price(array $f): array
    {
        $cfg = $this->buildConfig();
        $C = $cfg['constants'];

        $elec = ($f['kind'] ?? 'g') === 'e';
        $mode = $this->handoverMode($f);

        /* ---------- resolve the item / tier being sent ---------- */
        if ($elec) {
            $it = $this->findItem((string) ($f['item'] ?? ''));

            if (!$it) {
                return $this->emptyPrice(elec: true, mode: $mode);
            }
        } else {
            $size = (string) ($f['size'] ?? '');
            $tier = $this->findTier($size);

            if ($tier && $tier['perKg']) {
                $kg = min(
                    (int) $C['maxKg'],
                    max(11, (int) ceil((float) ($f['kg'] ?? 0)))
                );

                $it = [
                    'label' => $kg . ' kg',
                    'p' => (int) $C['base10'] + (int) $C['perKg'] * ($kg - 10),
                    'pack' => (int) $tier['pack'],
                    'pu' => $this->kgPu($kg),
                ];
            } else {
                $it = $tier ?? ['label' => '', 'p' => 0, 'pack' => 0, 'pu' => 0];
            }
        }

        /* ---------- packaging ---------- */
        $pack = !empty($f['pack']) ? (int) $it['pack'] : 0;

        /* ---------- point / mode / fee ---------- */
        [, $point] = array_pad(explode('|', (string) ($f['point'] ?? '')), 2, '');

        $share = (int) $it['pu'] <= 100;

        $fee = match ($mode) {
            'collect' => $share ? 0 : (int) $it['pu'] + 50,
            'out' => (int) $it['pu'] + 50,
            default => 0,
        };

        $n = max(1, (int) preg_replace('/\D/', '', (string) ($f['count'] ?? 1)) ?: 1);
        $free5 = $mode === 'collect' && $share;

        $coll = ($free5 || ($mode !== 'drop' && $share && $n > 1 && !empty($f['same'])))
            ? 0
            : $fee;

        /* ---------- total (COD is NOT included) ---------- */
        $total = (int) $it['p'] + $pack + $coll;

        /* ---------- points ---------- */
        $points = (int) floor($total * (float) $C['pointsRate']);

        return [
            'n' => $n,
            'point' => $point,
            'free5' => $free5,
            'mode' => $mode,
            'fee' => $fee,
            'base' => (int) $it['p'],
            'pack' => $pack,
            'coll' => $coll,
            'share' => $share,
            'total' => $total,
            'elec' => $elec,
            'item' => $it,
            'points' => $points,
        ];
    }

    /** Shape returned when an invalid item is picked. */
    private function emptyPrice(bool $elec, string $mode): array
    {
        return [
            'n' => 1,
            'point' => '',
            'free5' => false,
            'mode' => $mode,
            'fee' => 0,
            'base' => 0,
            'pack' => 0,
            'coll' => 0,
            'share' => false,
            'total' => 0,
            'elec' => $elec,
            'item' => ['label' => '', 'p' => 0, 'pack' => 0, 'pu' => 0],
            'points' => 0,
        ];
    }

    private function handoverMode(array $f): string
    {
        if (($f['hand'] ?? '') === 'collect') {
            return 'collect';
        }
        if (str_starts_with((string) ($f['point'] ?? ''), 'out|')) {
            return 'out';
        }

        return 'drop';
    }

    /** Per-kg pickup fee tiers (unchanged from frontend). */
    private function kgPu(int $kg): int
    {
        return $kg <= 20 ? 150 : ($kg <= 30 ? 200 : 250);
    }

    /* =================================================================
     |  BREAKDOWN  — mirror of frontend `breakdown(p)`
     * =================================================================*/

    public function breakdown(array $p): string
    {
        $m = $p['mode'];

        $feeText = match (true) {
            $m === 'drop' => ', drop-off free',
            $p['coll'] > 0 => ' + ' .
                ($m === 'collect' ? 'pickup ' : 'agent drop-off ') .
                $this->fmt($p['coll']),
            $p['free5'] => ', CBD pickup free',
            default => ', already paid today',
        };

        return $p['item']['label'] . ' delivery ' . $this->fmt($p['base'])
            . $feeText
            . ($p['pack'] ? ' + packaging ' . $this->fmt($p['pack']) : '')
            . '.';
    }

    /* =================================================================
     |  COD NOTE
     * =================================================================*/

    /**
     * Format the COD note. Matches the frontend wording.
     * Note: the COD fee is what WE (the platform) keep from the merchant's
     * payout — it is never added to the sender's total.
     */
    public function codNote(float $cod): string
    {
        if ($cod <= 0) {
            return '';
        }

        $rate = (float) $this->buildConfig()['constants']['codFeeRate'];
        $cut = (int) round($cod * $rate);

        return sprintf(
            'Recipient pays %s by M-PESA. Our %s%% fee is %s, so you receive %s.',
            $this->fmt($cod),
            rtrim(rtrim(number_format($rate * 100, 1), '0'), '.'),
            $this->fmt($cut),
            $this->fmt($cod - $cut)
        );
    }

    /* =================================================================
     |  HELPERS
     * =================================================================*/

    /** kg → price for the pricing table example. */
    public function kgPrice(float $kg): int
    {
        $C = $this->buildConfig()['constants'];

        return (int) $C['base10']
            + (int) $C['perKg'] * max(0, $kg - 10);
    }

    /** KSh formatter — matches frontend `fmt()`. */
    public function fmt(float|int $n): string
    {
        return 'KSh ' . number_format(round($n));
    }
}