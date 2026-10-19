<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PricingConstantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('pricing_constant')?->id;

        return [
            'key' => ['required', 'string', 'max:100', Rule::unique('pricing_constants', 'key')->ignore($id)],
            'value' => ['required', 'numeric'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}