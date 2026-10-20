<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ItemRequest;
use App\Models\Item;
use App\Models\ItemGroup;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ItemController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/settings/items', [
            'items' => Item::with('group')->orderBy('sort_order')->get(),
            'groups' => ItemGroup::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/items/form', [
            'item' => null,
            'groups' => ItemGroup::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(ItemRequest $request): RedirectResponse
    {
        Item::create($request->validated());
        return redirect()->route('admin.items.index')->with('success', 'Item created.');
    }

    public function edit(Item $item): Response
    {
        return Inertia::render('admin/items/form', [
            'item' => $item,
            'groups' => ItemGroup::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(ItemRequest $request, Item $item): RedirectResponse
    {
        $item->update($request->validated());
        return redirect()->route('admin.items.index')->with('success', 'Item updated.');
    }

    public function destroy(Item $item): RedirectResponse
    {
        $item->delete();
        return back()->with('success', 'Item deleted.');
    }
}