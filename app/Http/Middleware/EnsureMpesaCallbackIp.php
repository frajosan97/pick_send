<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMpesaCallbackIp
{
    /**
     * Safaricom production callback IPs.
     * Source: https://developer.safaricom.co.ke (updated periodically)
     */
    protected array $allowedIps = [
        '196.201.214.200',
        '196.201.214.206',
        '196.201.213.114',
        '196.201.214.207',
        '196.201.214.208',
        '196.201.213.44',
        '196.201.212.127',
        '196.201.212.128',
        '196.201.212.129',
        '196.201.212.132',
        '196.201.212.136',
        '196.201.212.138',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        // Skip IP check in local/sandbox so ngrok works
        if (!app()->environment('production')) {
            return $next($request);
        }

        if (!in_array($request->ip(), $this->allowedIps, true)) {
            abort(403, 'Forbidden');
        }

        return $next($request);
    }
}