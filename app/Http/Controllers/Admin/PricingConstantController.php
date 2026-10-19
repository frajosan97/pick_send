<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\PricingConstantRequest;
use App\Models\PricingConstant;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class PricingConstantController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/pricing-constants/index', [
            'constants' => PricingConstant::orderBy('key')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/pricing-constants/form', [
            'constant' => null,
        ]);
    }

    public function store(PricingConstantRequest $request): RedirectResponse
    {
        PricingConstant::create($request->validated());

        return redirect()
            ->route('admin.pricing-constants.index')
            ->with('success', 'Pricing constant created.');
    }

    public function edit(PricingConstant $pricingConstant): Response
    {
        return Inertia::render('admin/pricing-constants/form', [
            'constant' => $pricingConstant,
        ]);
    }

    public function update(PricingConstantRequest $request, PricingConstant $pricingConstant): RedirectResponse
    {
        $pricingConstant->update($request->validated());

        return redirect()
            ->route('admin.pricing-constants.index')
            ->with('success', 'Pricing constant updated.');
    }

    public function destroy(PricingConstant $pricingConstant): RedirectResponse
    {
        $pricingConstant->delete();

        return back()->with('success', 'Pricing constant deleted.');
    }
}