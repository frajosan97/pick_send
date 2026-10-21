<?php

namespace App\Http\Requests\Admin;

use App\Models\Payment;
use Illuminate\Foundation\Http\FormRequest;

class PaymentIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // gated by middleware/route
    }

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'type' => [
                'nullable',
                'in:' . implode(',', [
                    Payment::TYPE_DELIVERY,
                    Payment::TYPE_COD,
                    Payment::TYPE_WITHDRAWAL,
                    Payment::TYPE_REFUND,
                    Payment::TYPE_POINTS,
                ])
            ],
            'status' => [
                'nullable',
                'in:' . implode(',', [
                    Payment::STATUS_PENDING,
                    Payment::STATUS_SUCCESS,
                    Payment::STATUS_FAILED,
                ])
            ],
            'channel' => [
                'nullable',
                'in:' . implode(',', [
                    Payment::CHANNEL_PENDING,
                    Payment::CHANNEL_MPESA,
                    Payment::CHANNEL_CASH,
                    Payment::CHANNEL_WALLET,
                    Payment::CHANNEL_MANUAL,
                ])
            ],
            'parcel_id' => ['nullable', 'integer', 'exists:parcels,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'sort' => ['nullable', 'in:created_at,amount,confirmed_at,status,type'],
            'dir' => ['nullable', 'in:asc,desc'],
            'per_page' => ['nullable', 'integer', 'min:10', 'max:200'],
        ];
    }

    /**
     * Normalised filter array consumed by the controller.
     *
     * @return array{
     *     q: ?string,
     *     type: ?string,
     *     status: ?string,
     *     channel: ?string,
     *     parcel_id: ?int,
     *     user_id: ?int,
     *     from: ?\Illuminate\Support\Carbon,
     *     to: ?\Illuminate\Support\Carbon,
     *     sort: string,
     *     dir: string,
     *     per_page: int,
     * }
     */
    public function filters(): array
    {
        return [
            'q' => $this->filled('q') ? trim((string) $this->input('q')) : null,
            'type' => $this->input('type') ?: null,
            'status' => $this->input('status') ?: null,
            'channel' => $this->input('channel') ?: null,
            'parcel_id' => $this->filled('parcel_id') ? (int) $this->input('parcel_id') : null,
            'user_id' => $this->filled('user_id') ? (int) $this->input('user_id') : null,
            'from' => $this->filled('from') ? $this->date('from')->startOfDay() : null,
            'to' => $this->filled('to') ? $this->date('to')->endOfDay() : null,
            'sort' => $this->input('sort') ?: 'created_at',
            'dir' => $this->input('dir') ?: 'desc',
            'per_page' => (int) ($this->input('per_page') ?: 25),
        ];
    }
}