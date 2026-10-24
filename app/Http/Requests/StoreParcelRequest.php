<?php

namespace App\Http\Requests;

use App\Models\Parcel;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreParcelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->input('paynum') === '') {
            $this->merge(['paynum' => null]);
        }

        if ($this->input('payment_option') === Parcel::PAYMENT_COD_FULL) {
            $this->merge(['paynum' => null]);
        }
    }

    public function rules(): array
    {
        return [
            // ── sender ──────────────────────────────────────────────
            'sname' => ['required', 'string', 'max:120'],
            'sphone' => ['required', 'string', 'regex:/^0?7\d{8}$|^2547\d{8}$/'],
            'hand' => ['required', Rule::in(['drop', 'collect'])],
            'point' => ['required', 'string', 'max:200'],
            'addr' => ['required_if:hand,collect', 'nullable', 'string', 'max:200'],
            'count' => ['nullable', 'integer', 'min:1', 'max:50'],
            'same' => ['boolean'],

            // ── recipient ───────────────────────────────────────────
            'rname' => ['required', 'string', 'max:120'],
            'rphone' => ['required', 'string', 'regex:/^0?7\d{8}$|^2547\d{8}$/'],
            'rtown' => ['required', 'string', 'max:100'],

            // ── contents ────────────────────────────────────────────
            'what' => ['required', 'string', 'max:200'],
            'worth' => ['required', 'numeric', 'min:1', 'max:1000000'],
            'kind' => ['required', Rule::in(['g', 'e'])],
            'size' => ['nullable', 'string', 'max:20'],
            'kg' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'item' => ['nullable', 'string', 'max:50'],
            'pack' => ['boolean'],

            // ── payment ─────────────────────────────────────────────
            'paynum' => [
                Rule::requiredIf(fn() => in_array(
                    $this->input('payment_option'),
                    [Parcel::PAYMENT_PREPAID, Parcel::PAYMENT_COD_FEE],
                    true
                )),
                'nullable',
                'string',
                'regex:/^0?7\d{8}$|^2547\d{8}$/',
            ],
            'cod' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'payment_option' => [
                'required',
                Rule::in(Parcel::PAYMENT_OPTIONS),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $opt = $this->input('payment_option');
            $cod = (float) $this->input('cod', 0);

            if (
                in_array($opt, [Parcel::PAYMENT_COD_FEE, Parcel::PAYMENT_COD_FULL], true)
                && $cod <= 0
            ) {
                $v->errors()->add('cod', 'Enter the Cash on Delivery amount the recipient will pay on delivery.');
            }

            if ($opt === Parcel::PAYMENT_PREPAID && $cod > 0) {
                $v->errors()->add('cod', 'Prepaid parcels cannot have a Cash on Delivery amount.');
            }

            if (
                $this->input('kind') === 'g'
                && $this->input('size') === 'kg'
                && (float) $this->input('kg', 0) <= 0
            ) {
                $v->errors()->add('kg', 'Enter the parcel weight in kg.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'sphone.regex' => 'Enter a valid Kenyan mobile number (07XX XXX XXX).',
            'rphone.regex' => 'Enter a valid Kenyan mobile number (07XX XXX XXX).',
            'paynum.regex' => 'Enter a valid Kenyan mobile number (07XX XXX XXX).',
            'rtown.required' => 'Choose a destination town.',
        ];
    }

    public function payload(): array
    {
        return [
            'sname' => $this->input('sname'),
            'sphone' => $this->input('sphone'),
            'hand' => $this->input('hand'),
            'point' => $this->input('point'),
            'addr' => $this->input('addr'),
            'count' => (int) $this->input('count', 1),
            'same' => (bool) $this->input('same', false),
            'rname' => $this->input('rname'),
            'rphone' => $this->input('rphone'),
            'rtown' => $this->input('rtown'),
            'what' => $this->input('what'),
            'worth' => (float) $this->input('worth'),
            'kind' => $this->input('kind'),
            'size' => $this->input('size'),
            'kg' => $this->input('kg'),
            'item' => $this->input('item'),
            'pack' => (bool) $this->input('pack', false),

            // Null out the paynum for COD full, otherwise pass it as-is
            'paynum' => $this->input('payment_option') === Parcel::PAYMENT_COD_FULL
                ? null
                : ($this->filled('paynum') ? $this->input('paynum') : null),

            'cod' => (int) round((float) $this->input('cod', 0)),
            'payment_option' => $this->input('payment_option'),
        ];
    }
}