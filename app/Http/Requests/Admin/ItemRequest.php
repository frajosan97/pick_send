<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('item')?->id;

        return [
            'item_group_id' => ['required', 'exists:item_groups,id'],
            'code' => ['required', 'string', 'max:50', Rule::unique('items', 'code')->ignore($id)],
            'label' => ['required', 'string', 'max:255'],
            'price' => ['required', 'integer', 'min:0'],
            'packaging' => ['required', 'integer', 'min:0'],
            'pickup_fee' => ['required', 'integer', 'min:0'],
            'sort_order' => ['integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }
}