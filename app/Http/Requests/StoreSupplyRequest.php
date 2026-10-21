<?php

namespace App\Http\Requests;

use App\Models\SupplyRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupplyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // public endpoint
    }

    /**
     * Normalize phone numbers and frequency case before validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('phone') && is_string($this->phone)) {
            $this->merge(['phone' => formatPhoneNumber($this->phone)]);
        }

        if ($this->filled('sphone') && is_string($this->sphone)) {
            $this->merge(['sphone' => formatPhoneNumber($this->sphone)]);
        }

        // Accept both the public front-end key (`often`, Title Case)
        // and the admin key (`frequency`, lowercase). Normalize to
        // lowercase regardless of source.
        $freq = $this->input('often') ?? $this->input('frequency');
        if (is_string($freq)) {
            $this->merge(['often' => strtolower($freq)]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'regex:/^2547\d{8}$/'],
            'town' => ['nullable', 'string', 'max:255'],       // public form
            'town_id' => ['nullable', 'integer', 'exists:towns,id'], // admin form
            'what' => ['required', 'string', 'max:500'],
            'from' => ['nullable', 'string', 'max:500'],        // public form
            'pickup_from' => ['nullable', 'string', 'max:255'],   // admin form
            'sphone' => ['nullable', 'string', 'regex:/^2547\d{8}$/'],
            'supplier_phone' => ['nullable', 'string', 'max:20'], // admin form
            'often' => ['required', Rule::in(array_keys(SupplyRequest::FREQUENCIES))],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['nullable', Rule::in(array_keys(SupplyRequest::STATUSES))],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Enter a valid Safaricom number, e.g. 0712 345 678.',
            'sphone.regex' => 'Enter a valid Safaricom number or leave blank.',
            'often.in' => 'Pick one of: Once, Daily, Weekly, Monthly.',
            'town.max' => 'Town name is too long.',
        ];
    }
}