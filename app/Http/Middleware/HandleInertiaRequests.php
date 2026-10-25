<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'sidebarOpen' => !$request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'config' => [
                'whatsapp' => (string) config('services.pick_and_send.whatsapp', ''),
            ],
            'flash' => [
                'booking' => fn() => $request->session()->get('booking'),
                'supply' => fn() => $request->session()->get('supply'),
                'payment_confirmed' => fn() => $request->session()->get('payment_confirmed'),
                'stk_error' => fn() => $request->session()->get('stk_error'),
                'otp_attempted' => fn() => $request->session()->get('otp_attempted'),
                'otp_sent' => fn() => $request->session()->get('otp_sent'),
                'otp_phone' => fn() => $request->session()->get('otp_phone'),
                'withdrawn' => fn() => $request->session()->get('withdrawn'),
                'withdraw_receipt' => fn() => $request->session()->get('withdraw_receipt'),
                'success' => fn() => $request->session()->get('success'),
                'error' => fn() => $request->session()->get('error'),
            ],
        ];
    }
}