<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreSupplyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'regex:/^0?7\d{8}$|^2547\d{8}$/'],
            'town' => ['required', 'string'],
            'what' => ['required', 'string', 'max:500'],
            'from' => ['required', 'string', 'max:500'],
            'sphone' => ['nullable', 'string', 'regex:/^0?7\d{8}$|^2547\d{8}$/'],
            'often' => ['required', 'in:Once,Daily,Weekly,Monthly'],
        ];
    }
}
