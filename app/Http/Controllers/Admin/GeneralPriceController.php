<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\GeneralPriceRequest;
use App\Models\GeneralPrice;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class GeneralPriceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/settings/general-prices', [
            'prices' => GeneralPrice::orderBy('sort_order')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/general-prices/form', [
            'price' => null,
        ]);
    }

    public function store(GeneralPriceRequest $request): RedirectResponse
    {
        GeneralPrice::create($request->validated());

        return redirect()
            ->route('admin.general-prices.index')
            ->with('success', 'General price created.');
    }

    public function edit(GeneralPrice $generalPrice): Response
    {
        return Inertia::render('admin/general-prices/form', [
            'price' => $generalPrice,
        ]);
    }

    public function update(GeneralPriceRequest $request, GeneralPrice $generalPrice): RedirectResponse
    {
        $generalPrice->update($request->validated());

        return redirect()
            ->route('admin.general-prices.index')
            ->with('success', 'General price updated.');
    }

    public function destroy(GeneralPrice $generalPrice): RedirectResponse
    {
        $generalPrice->delete();

        return back()->with('success', 'General price deleted.');
    }
}