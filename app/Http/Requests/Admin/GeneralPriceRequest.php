<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GeneralPriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('general_price')?->id;

        return [
            'code' => ['required', 'string', 'max:20', Rule::unique('general_prices', 'code')->ignore($id)],
            'label' => ['required', 'string', 'max:255'],
            'price' => ['required', 'integer', 'min:0'],
            'packaging' => ['required', 'integer', 'min:0'],
            'pickup_fee' => ['required', 'integer', 'min:0'],
            'per_kg' => ['boolean'],
            'sort_order' => ['required', 'integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }
}