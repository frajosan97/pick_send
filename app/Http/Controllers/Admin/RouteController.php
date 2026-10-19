<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\RouteRequest;
use App\Models\Route;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class RouteController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/routes/index', [
            'routes' => Route::with('towns')->withCount('towns')->orderBy('name')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/routes/form', [
            'routeModel' => null,
        ]);
    }

    public function store(RouteRequest $request): RedirectResponse
    {
        Route::create($request->validated());

        return redirect()
            ->route('admin.routes.index')
            ->with('success', 'Route created.');
    }

    public function edit(Route $route): Response
    {
        return Inertia::render('admin/routes/form', [
            'routeModel' => $route->load('towns'),
        ]);
    }

    public function update(RouteRequest $request, Route $route): RedirectResponse
    {
        $route->update($request->validated());

        return redirect()
            ->route('admin.routes.index')
            ->with('success', 'Route updated.');
    }

    public function destroy(Route $route): RedirectResponse
    {
        $route->delete();

        return back()->with('success', 'Route deleted.');
    }
}