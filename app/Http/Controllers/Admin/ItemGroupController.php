<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ItemGroupRequest;
use App\Models\ItemGroup;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ItemGroupController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/item-groups/index', [
            'groups' => ItemGroup::withCount('items')->orderBy('sort_order')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/item-groups/form', ['group' => null]);
    }

    public function store(ItemGroupRequest $request): RedirectResponse
    {
        ItemGroup::create($request->validated());
        return redirect()->route('admin.item-groups.index')->with('success', 'Group created.');
    }

    public function edit(ItemGroup $itemGroup): Response
    {
        return Inertia::render('admin/item-groups/form', ['group' => $itemGroup]);
    }

    public function update(ItemGroupRequest $request, ItemGroup $itemGroup): RedirectResponse
    {
        $itemGroup->update($request->validated());
        return redirect()->route('admin.item-groups.index')->with('success', 'Group updated.');
    }

    public function destroy(ItemGroup $itemGroup): RedirectResponse
    {
        $itemGroup->delete();
        return back()->with('success', 'Group deleted.');
    }
}