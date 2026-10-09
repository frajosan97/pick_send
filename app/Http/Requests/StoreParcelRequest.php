<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreParcelRequest extends FormRequest
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
            'sname' => ['required', 'string', 'max:120'],
            'sphone' => ['required', 'string', 'regex:/^0?7\d{8}$|^2547\d{8}$/'],
            'hand' => ['required', 'in:drop,collect'],
            'point' => ['required', 'string'],
            'addr' => ['required_if:hand,collect', 'nullable', 'string', 'max:200'],
            'count' => ['nullable', 'integer', 'min:1'],
            'same' => ['boolean'],

            'rname' => ['required', 'string', 'max:120'],
            'rphone' => ['required', 'string', 'regex:/^0?7\d{8}$|^2547\d{8}$/'],
            'rtown' => ['required', 'string'],

            'what' => ['required', 'string', 'max:200'],
            'worth' => ['required', 'numeric', 'min:1'],
            'kind' => ['required', 'in:g,e'],
            'size' => ['required_if:kind,g', 'nullable', 'string'],
            'kg' => ['nullable', 'numeric', 'min:0'],
            'item' => ['required_if:kind,e', 'nullable', 'string'],
            'pack' => ['boolean'],

            'paynum' => ['required', 'string', 'regex:/^0?7\d{8}$|^2547\d{8}$/'],
            'cod' => ['nullable', 'numeric', 'min:0'],
        ];
    }
}
