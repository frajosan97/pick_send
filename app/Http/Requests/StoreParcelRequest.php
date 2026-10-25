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
                $v->errors()->add(
                    'cod',
                    'Enter the Cash on Delivery amount the recipient will pay on delivery.'
                );
            }

            if ($opt === Parcel::PAYMENT_PREPAID && $cod > 0) {
                $v->errors()->add(
                    'cod',
                    'Prepaid parcels cannot have a Cash on Delivery amount.'
                );
            }

            if (
                $this->input('kind') === 'g'
                && $this->input('size') === 'kg'
                && (float) $this->input('kg', 0) <= 0
            ) {
                $v->errors()->add(
                    'kg',
                    'Enter the parcel weight in kg.'
                );
            }
        });
    }

    /**
     * Friendly names for every attribute. These names are used inside
     * any default Laravel message (e.g. "The Recipient name field is required.").
     */
    public function attributes(): array
    {
        return [
            // sender
            'sname' => 'Sender name',
            'sphone' => 'Sender phone',
            'hand' => 'Handling option',
            'point' => 'Pickup point',
            'addr' => 'Sender address',
            'count' => 'Parcel count',
            'same' => 'Same recipient',

            // recipient
            'rname' => 'Recipient name',
            'rphone' => 'Recipient phone',
            'rtown' => 'Destination town',

            // contents
            'what' => 'Parcel contents',
            'worth' => 'Parcel worth',
            'kind' => 'Parcel kind',
            'size' => 'Size',
            'kg' => 'Weight (kg)',
            'item' => 'Item',
            'pack' => 'Packaging',

            // payment
            'paynum' => 'Payment phone',
            'cod' => 'Cash on Delivery amount',
            'payment_option' => 'Payment option',
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
            // ── sender ──────────────────────────────────────────────
            'sname.required' => "Enter the sender's full name.",
            'sname.string' => "Sender name must be text.",
            'sname.max' => "Sender name is too long (max 120 characters).",

            'sphone.required' => "Enter the sender's phone number.",
            'sphone.string' => "Sender phone must be text.",
            'sphone.regex' => "Enter a valid Kenyan mobile number (07XX XXX XXX).",

            'hand.required' => "Choose how the parcel will be handed over.",
            'hand.in' => "Handling option must be either drop-off or collect.",

            'point.required' => "Enter the pickup point.",
            'point.string' => "Pickup point must be text.",
            'point.max' => "Pickup point is too long (max 200 characters).",

            'addr.required_if' => "Enter the sender's address when the parcel is collected.",
            'addr.string' => "Sender address must be text.",
            'addr.max' => "Sender address is too long (max 200 characters).",

            'count.integer' => "Parcel count must be a whole number.",
            'count.min' => "You must send at least 1 parcel.",
            'count.max' => "You cannot send more than 50 parcels at once.",

            'same.boolean' => "The same-recipient flag must be true or false.",

            // ── recipient ───────────────────────────────────────────
            'rname.required' => "Enter the recipient's full name.",
            'rname.string' => "Recipient name must be text.",
            'rname.max' => "Recipient name is too long (max 120 characters).",

            'rphone.required' => "Enter the recipient's phone number.",
            'rphone.string' => "Recipient phone must be text.",
            'rphone.regex' => "Enter a valid Kenyan mobile number (07XX XXX XXX).",

            'rtown.required' => "Choose a destination town.",
            'rtown.string' => "Destination town must be text.",
            'rtown.max' => "Destination town is too long (max 100 characters).",

            // ── contents ────────────────────────────────────────────
            'what.required' => "Describe what is inside the parcel.",
            'what.string' => "Parcel contents must be text.",
            'what.max' => "Parcel description is too long (max 200 characters).",

            'worth.required' => "Enter the value of the parcel.",
            'worth.numeric' => "Parcel worth must be a number.",
            'worth.min' => "Parcel worth must be at least KES 1.",
            'worth.max' => "Parcel worth cannot exceed KES 1,000,000.",

            'kind.required' => "Select the parcel kind (general or express).",
            'kind.in' => "Parcel kind must be either general (g) or express (e).",

            'size.string' => "Size must be text.",
            'size.max' => "Size is too long (max 20 characters).",

            'kg.numeric' => "Weight must be a number.",
            'kg.min' => "Weight cannot be negative.",
            'kg.max' => "Weight cannot exceed 100 kg.",

            'item.string' => "Item must be text.",
            'item.max' => "Item name is too long (max 50 characters).",

            'pack.boolean' => "The packaging flag must be true or false.",

            // ── payment ─────────────────────────────────────────────
            'paynum.required' => "Enter the phone number that will pay for this parcel.",
            'paynum.string' => "Payment phone must be text.",
            'paynum.regex' => "Enter a valid Kenyan mobile number (07XX XXX XXX).",

            'cod.numeric' => "Cash on Delivery amount must be a number.",
            'cod.min' => "Cash on Delivery amount cannot be negative.",
            'cod.max' => "Cash on Delivery amount cannot exceed KES 1,000,000.",

            'payment_option.required' => "Choose a payment option.",
            'payment_option.in' => "Invalid payment option selected.",
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