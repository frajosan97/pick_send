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

    /**
     * Normalise the payload BEFORE validation runs.
     *
     * The frontend clears paynum to "" when the user picks cod_full
     * (nobody pays via M-PESA at booking time). But `nullable` only
     * skips validation for null, not for "". An empty string still
     * hits the regex rule and fails, which is why the user was
     * seeing "The paynum field is required" / regex errors on a
     * hidden field.
     *
     * Coercing "" -> null here means:
     *   - cod_full  + paynum ""  -> null -> requiredIf false -> passes
     *   - prepaid   + paynum ""  -> null -> requiredIf true  -> fails (correct)
     *   - prepaid   + paynum set -> untouched -> passes
     */
    protected function prepareForValidation(): void
    {
        if ($this->input('paynum') === '') {
            $this->merge(['paynum' => null]);
        }

        // cod_full never carries an M-PESA number; drop any stale
        // value a client might still submit.
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
            // paynum is only required when some amount is due now,
            // i.e. prepaid or cod_fee. For cod_full nobody pays via
            // M-PESA at booking time, so the number is not needed.
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

            // The one field that drives everything downstream.
            'payment_option' => [
                'required',
                Rule::in(Parcel::PAYMENT_OPTIONS),
            ],
        ];
    }

    /**
     * Cross-field checks that the flat rules cannot express.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $opt = $this->input('payment_option');
            $cod = (float) $this->input('cod', 0);

            // COD options only make sense with a positive COD amount.
            if (
                in_array($opt, [Parcel::PAYMENT_COD_FEE, Parcel::PAYMENT_COD_FULL], true)
                && $cod <= 0
            ) {
                $v->errors()->add(
                    'cod',
                    'Enter the Cash on Delivery amount the recipient will pay on delivery.'
                );
            }

            // Prepaid must NOT carry a COD amount — otherwise it silently
            // becomes a split payment and the wrong STK amount fires.
            if ($opt === Parcel::PAYMENT_PREPAID && $cod > 0) {
                $v->errors()->add(
                    'cod',
                    'Prepaid parcels cannot have a Cash on Delivery amount. '
                    . 'Choose "Pay delivery now, recipient pays goods" if the recipient is paying for goods.'
                );
            }

            // Weight is required when a general parcel uses the kg tier.
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

    /**
     * The exact shape the PricingService and BookingService expect.
     * Renaming happens here, in one place, so the services never see
     * form keys and the form never sees DB keys.
     */
    public function payload(): array
    {
        return [
            // sender
            'sname' => $this->input('sname'),
            'sphone' => $this->input('sphone'),
            'hand' => $this->input('hand'),
            'point' => $this->input('point'),
            'addr' => $this->input('addr'),
            'count' => (int) $this->input('count', 1),
            'same' => (bool) $this->input('same', false),

            // recipient
            'rname' => $this->input('rname'),
            'rphone' => $this->input('rphone'),
            'rtown' => $this->input('rtown'),

            // contents
            'what' => $this->input('what'),
            'worth' => (float) $this->input('worth'),
            'kind' => $this->input('kind'),
            'size' => $this->input('size'),
            'kg' => $this->input('kg'),
            'item' => $this->input('item'),
            'pack' => (bool) $this->input('pack', false),

            // payment
            // Normalise paynum to null for cod_full so nothing
            // downstream accidentally treats an empty string as a
            // real phone number. (prepareForValidation() already
            // handles this, but keeping it here as defence-in-depth
            // if payload() is called from elsewhere.)
            'paynum' => $this->input('payment_option') === Parcel::PAYMENT_COD_FULL
                ? null
                : ($this->filled('paynum') ? $this->input('paynum') : null),
            'cod' => (int) round((float) $this->input('cod', 0)),
            'payment_option' => $this->input('payment_option'),
        ];
    }
}