<?php

namespace App\Http\Requests\Admin;

use App\Models\Parcel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ParcelIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('admin') ?? false;
    }

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:80'],
            'status' => ['nullable', Rule::in(array_keys((new Parcel)->statusMap()))],
            'payment_option' => ['nullable', Rule::in(Parcel::PAYMENT_OPTIONS)],
            'town_id' => ['nullable', 'integer', 'exists:towns,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'sort' => ['nullable', Rule::in(['created_at', 'total', 'paid_at', 'status'])],
            'dir' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:100'],
        ];
    }

    /**
     * Normalised filter bag — used by the controller so it never
     * re-parses the raw query string.
     */
    public function filters(): array
    {
        $tz = config('app.timezone');

        return [
            'q' => trim((string) $this->input('q', '')) ?: null,
            'status' => $this->input('status') ?: null,
            'payment_option' => $this->input('payment_option') ?: null,
            'town_id' => $this->integer('town_id') ?: null,
            'from' => $this->filled('from')
                ? \Carbon\Carbon::parse($this->input('from'), $tz)->startOfDay()
                : null,
            'to' => $this->filled('to')
                ? \Carbon\Carbon::parse($this->input('to'), $tz)->endOfDay()
                : null,
            'sort' => $this->input('sort', 'created_at'),
            'dir' => $this->input('dir', 'desc'),
            'per_page' => (int) $this->input('per_page', 25),
        ];
    }
}