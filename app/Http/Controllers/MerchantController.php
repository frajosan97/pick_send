<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\MerchantService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MerchantController extends Controller
{
    public function __construct(private MerchantService $merchants)
    {
    }

    public function requestOtp(Request $request): RedirectResponse
    {
        $data = $request->validate(['phone' => ['required', 'string']]);
        $this->merchants->sendOtp($data['phone']);

        return back()->with('otp_sent', true);
    }

    public function verifyOtp(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'code' => ['required', 'digits:6'],
        ]);

        if (!$this->merchants->verifyOtp($data['phone'], $data['code'])) {
            return back()->withErrors(['code' => 'Wrong or expired code.']);
        }

        $user = User::firstOrCreate(
            ['phone' => $data['phone']],
            [
                'name' => 'Merchant',
                'type' => 'merchant',
                'password' => bcrypt(str()->random(20)),
            ],
        );

        Auth::login($user);
        $request->session()->regenerate();

        return back();
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return back();
    }

    public function withdraw(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user?->isMerchant(), 403);

        $this->merchants->withdraw($user);

        return back()->with('withdrawn', true);
    }
}