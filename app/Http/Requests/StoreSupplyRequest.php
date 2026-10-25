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
            'town' => ['nullable', 'string', 'max:255'],            // public form
            'town_id' => ['nullable', 'integer', 'exists:towns,id'], // admin form
            'what' => ['required', 'string', 'max:500'],
            'from' => ['nullable', 'string', 'max:500'],             // public form
            'pickup_from' => ['nullable', 'string', 'max:255'],      // admin form
            'sphone' => ['nullable', 'string', 'regex:/^2547\d{8}$/'],
            'supplier_phone' => ['nullable', 'string', 'max:20'],    // admin form
            'often' => ['required', Rule::in(array_keys(SupplyRequest::FREQUENCIES))],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['nullable', Rule::in(array_keys(SupplyRequest::STATUSES))],
        ];
    }

    /**
     * Friendly names used inside any default Laravel message,
     * e.g. "The Supplier name field is required."
     */
    public function attributes(): array
    {
        return [
            'name' => 'Supplier name',
            'phone' => 'Supplier phone',
            'town' => 'Town',
            'town_id' => 'Town',
            'what' => 'Supply description',
            'from' => 'Pickup location',
            'pickup_from' => 'Pickup location',
            'sphone' => 'Supplier phone',
            'supplier_phone' => 'Supplier phone',
            'often' => 'Frequency',
            'user_id' => 'User',
            'status' => 'Status',
        ];
    }

    /**
     * Custom messages — one per rule that needs friendlier wording.
     * Anything not listed here falls back to the default message,
     * using the friendly names from attributes().
     */
    public function messages(): array
    {
        return [
            // ── name ────────────────────────────────────────────────
            'name.required' => "Enter the supplier's full name.",
            'name.string' => "Supplier name must be text.",
            'name.max' => "Supplier name is too long (max 120 characters).",

            // ── phone ───────────────────────────────────────────────
            'phone.required' => "Enter the supplier's phone number.",
            'phone.string' => "Supplier phone must be text.",
            'phone.regex' => "Enter a valid Safaricom number, e.g. 0712 345 678.",

            // ── town / town_id ──────────────────────────────────────
            'town.string' => "Town name must be text.",
            'town.max' => "Town name is too long.",
            'town_id.integer' => "Choose a valid town.",
            'town_id.exists' => "The selected town does not exist.",

            // ── what ────────────────────────────────────────────────
            'what.required' => "Describe what you want to supply.",
            'what.string' => "Supply description must be text.",
            'what.max' => "Supply description is too long (max 500 characters).",

            // ── from / pickup_from ──────────────────────────────────
            'from.string' => "Pickup location must be text.",
            'from.max' => "Pickup location is too long (max 500 characters).",
            'pickup_from.string' => "Pickup location must be text.",
            'pickup_from.max' => "Pickup location is too long (max 255 characters).",

            // ── sphone / supplier_phone ─────────────────────────────
            'sphone.string' => "Supplier phone must be text.",
            'sphone.regex' => "Enter a valid Safaricom number or leave blank.",
            'supplier_phone.string' => "Supplier phone must be text.",
            'supplier_phone.max' => "Supplier phone is too long (max 20 characters).",

            // ── often ───────────────────────────────────────────────
            'often.required' => "Choose how often you want to supply.",
            'often.in' => "Pick one of: Once, Daily, Weekly, Monthly.",

            // ── user_id ─────────────────────────────────────────────
            'user_id.integer' => "Choose a valid user.",
            'user_id.exists' => "The selected user does not exist.",

            // ── status ──────────────────────────────────────────────
            'status.in' => "Choose a valid status.",
        ];
    }
}