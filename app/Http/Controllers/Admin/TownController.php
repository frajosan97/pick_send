<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\TownRequest;
use App\Models\Route;
use App\Models\Town;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class TownController extends Controller
{
    public function create(Route $route): Response
    {
        return Inertia::render('admin/towns/form', [
            'routeModel' => $route,
            'town' => null,
        ]);
    }

    public function store(TownRequest $request, Route $route): RedirectResponse
    {
        $route->towns()->create($request->validated());

        return redirect()
            ->route('admin.routes.edit', $route)
            ->with('success', 'Town added.');
    }

    public function edit(Route $route, Town $town): Response
    {
        return Inertia::render('admin/towns/form', [
            'routeModel' => $route,
            'town' => $town,
        ]);
    }

    public function update(TownRequest $request, Route $route, Town $town): RedirectResponse
    {
        $town->update($request->validated());

        return redirect()
            ->route('admin.routes.edit', $route)
            ->with('success', 'Town updated.');
    }

    public function destroy(Route $route, Town $town): RedirectResponse
    {
        $town->delete();

        return back()->with('success', 'Town removed.');
    }
}