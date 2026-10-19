<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TownRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $route = $this->route('route');
        $town = $this->route('town');

        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('towns', 'name')
                    ->where('route_id', $route->id)
                    ->ignore($town?->id),
            ],
            'is_satellite' => ['boolean'],
            'satellite_fee' => ['integer', 'min:0'],
            'sort_order' => ['integer', 'min:0'],
            'is_active' => ['boolean'],
        ];
    }
}