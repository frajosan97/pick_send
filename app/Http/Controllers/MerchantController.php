<?php

namespace App\Http\Controllers;

use App\Exceptions\Merchant\MerchantException;
use App\Models\MerchantOrder;
use App\Models\User;
use App\Services\MerchantService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MerchantController extends Controller
{
    public function __construct(
        private MerchantService $merchants
    ) {
    }

    /* ============================================================
     | Dashboard
     |============================================================ */

    public function index(Request $request): Response
    {
        $merchant = $request->user();

        abort_unless($merchant?->isMerchant(), 403);

        return Inertia::render('merchants/index', [
            'auth' => [
                'user' => $merchant,
            ],
            'merchant' => $this->dashboardPayload($merchant),
        ]);
    }

    /**
     * Build the merchant dashboard payload from the slim join table.
     * All display fields come from the parcel, never duplicated.
     */
    private function dashboardPayload(User $merchant): array
    {
        $wallet = $merchant->walletOrCreate();

        // One query, eager-loaded parcels, capped.
        $orders = MerchantOrder::query()
            ->where('merchant_id', $merchant->id)
            ->with(['parcel:id,tracking_no,recipient_name,town_id,status,cod_amount'])
            ->latest()
            ->take(10)
            ->get()
            ->map(fn(MerchantOrder $o) => [
                'tracking_no' => $o->parcel?->tracking_no,
                'recipient_name' => $o->parcel?->recipient_name,
                'town' => $o->parcel?->town?->name ?? '',
                'status' => $o->parcel?->status,
                'cod_amount' => (int) ($o->parcel?->cod_amount ?? 0),
            ])
            ->filter(fn($o) => $o['tracking_no'] !== null)
            ->values()
            ->all();

        // One query for points sum instead of loading the ledgers.
        $points = (int) $merchant->pointLedgers()->sum('points');

        // Aggregate wallet activity for the current calendar month.
        $withdrawnThisMonth = (int) $merchant->payments()
            ->where('type', 'withdrawal')
            ->where('status', 'success')
            ->whereBetween('confirmed_at', [now()->startOfMonth(), now()])
            ->sum('amount');

        // "Waiting" = successfully-paid parcels whose payout hasn't settled
        // (or any other rule you already have). Placeholder 0 to match
        // the current UI until the rule is defined.
        $waiting = 0;

        return [
            'wallet' => (int) ($wallet->balance ?? 0),
            'waiting' => $waiting,
            'withdrawn_month' => $withdrawnThisMonth,
            'points' => $points,
            'orders' => $orders,
        ];
    }

    /* ============================================================
     | OTP: request
     |============================================================ */

    public function requestOtp(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
        ]);

        $phone = formatPhoneNumber($data['phone']);
        $rawPhone = $data['phone'];

        $phoneKey = 'merchant-otp:phone:' . $phone;
        $ipKey = 'merchant-otp:ip:' . $request->ip();

        if (RateLimiter::tooManyAttempts($phoneKey, 5)) {
            throw ValidationException::withMessages([
                'phone' => 'Too many requests for this number. Try again in '
                    . RateLimiter::availableIn($phoneKey) . ' seconds.',
            ]);
        }
        if (RateLimiter::tooManyAttempts($ipKey, 20)) {
            throw ValidationException::withMessages([
                'phone' => 'Too many requests from this network. Try again later.',
            ]);
        }

        RateLimiter::hit($ipKey, 600);

        $base = back()
            ->with('otp_attempted', true)
            ->with('otp_phone', $phone);

        // Single query with eager-loaded roles — avoid re-querying for isMerchant().
        $user = $this->findUserByAnyPhoneFormat($phone, $rawPhone, ['roles']);

        if (!$user) {
            Log::info('merchant.otp.user_not_found', [
                'phone_hash' => hash('sha256', $phone),
                'phone' => app()->isProduction() ? null : $phone,
                'raw_phone' => app()->isProduction() ? null : $rawPhone,
            ]);

            return app()->isProduction()
                ? $base
                : $base->withErrors([
                    'phone' => "No user found for {$phone} (raw: {$rawPhone}).",
                ]);
        }

        if (!$user->isMerchant()) {
            Log::info('merchant.otp.non_merchant_phone', [
                'phone_hash' => hash('sha256', $phone),
                'user_id' => $user->id,
                'roles' => $user->getRoleNames()->all(),
            ]);

            return app()->isProduction()
                ? $base
                : $base->withErrors([
                    'phone' => "User #{$user->id} found but is not a merchant.",
                ]);
        }

        RateLimiter::hit($phoneKey, 600);

        try {
            $this->merchants->sendOtp($user->phone);
        } catch (MerchantException $e) {
            return $base->withErrors([$e->field => $e->getMessage()]);
        }

        return $base->with('otp_sent', true);
    }

    /* ============================================================
     | OTP: verify
     |============================================================ */

    public function verifyOtp(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
            'code' => ['required', 'digits:6'],
        ]);

        $phone = formatPhoneNumber($data['phone']);
        $rawPhone = $data['phone'];

        $verifyKey = 'merchant-verify:' . $phone;

        if (RateLimiter::tooManyAttempts($verifyKey, 10)) {
            throw ValidationException::withMessages([
                'code' => 'Too many attempts. Request a new code.',
            ]);
        }

        $user = $this->findUserByAnyPhoneFormat($phone, $rawPhone, ['roles']);

        if (!$user || !$user->isMerchant()) {
            return back()
                ->with('otp_attempted', true)
                ->with('otp_phone', $phone)
                ->withErrors(['phone' => 'This account is not a merchant.']);
        }

        try {
            $this->merchants->verifyOtp($user->phone, $data['code']);
        } catch (MerchantException $e) {
            RateLimiter::hit($verifyKey, 900);

            return back()
                ->with('otp_attempted', true)
                ->with('otp_phone', $phone)
                ->withErrors([$e->field => $e->getMessage()]);
        }

        RateLimiter::clear($verifyKey);

        if (!$user->hasVerifiedPhone()) {
            $user->forceFill(['phone_verified_at' => now()])->save();
        }

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('merchants.index');
    }

    /* ============================================================
     | Logout
     |============================================================ */

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Back to the public home page, not the auth-gated dashboard.
        return redirect()->to('/#merchants');
    }

    /* ============================================================
     | Withdraw
     |============================================================ */

    public function withdraw(Request $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user?->isMerchant(), 403);

        try {
            $withdrawal = $this->merchants->withdraw($user);
        } catch (MerchantException $e) {
            return back()->withErrors([$e->field => $e->getMessage()]);
        } catch (\Throwable $e) {
            report($e);

            return back()->withErrors([
                'withdraw' => 'Withdrawal could not be processed. Try again later.',
            ]);
        }

        return back()
            ->with('withdrawn', true)
            ->with('withdraw_receipt', $withdrawal->mpesa_receipt);
    }

    /* ============================================================
     | Helpers
     |============================================================ */

    /**
     * Find a user whose stored phone matches the given input in any
     * reasonable format. Tries exact canonical, exact raw, then
     * last-9-digit suffix — one query each, short-circuiting on hit.
     *
     * @param string[] $with  Relations to eager-load (e.g. ['roles']).
     */
    private function findUserByAnyPhoneFormat(
        string $canonical,
        string $raw,
        array $with = [],
    ): ?User {
        $query = fn() => User::query()->with($with);

        if ($u = $query()->where('phone', $canonical)->first()) {
            return $u;
        }

        if ($u = $query()->where('phone', $raw)->first()) {
            return $u;
        }

        $digits = preg_replace('/\D/', '', $canonical);
        $tail = substr($digits, -9);

        if (strlen($tail) === 9) {
            if ($u = $query()->where('phone', 'like', "%{$tail}")->first()) {
                return $u;
            }
        }

        return null;
    }
}