<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'role' => [
                'nullable',
                Rule::in(['staff', 'merchant', 'customer', 'admin', 'admin_staff']),
            ],
            'q' => ['nullable', 'string', 'max:255'],
        ]);

        // "admin_staff" is a UI group, not a real role.
        // It expands to users having EITHER 'admin' OR 'staff'.
        $role = $validated['role'] ?? 'admin_staff';
        $q = $validated['q'] ?? null;

        $users = User::query()
            ->when($role === 'admin_staff', function ($query) {
                // hasRole() with array => "has any of these roles"
                $query->whereHas('roles', function ($q) {
                    $q->whereIn('name', ['admin', 'staff']);
                });
            }, function ($query) use ($role) {
                $query->role($role);
            })
            ->when($q, function ($query) use ($q) {
                $like = "%{$q}%";
                $query->where(function ($q2) use ($like) {
                    $q2->where('name', 'like', $like)
                        ->orWhere('email', 'like', $like)
                        ->orWhere('phone', 'like', $like)
                        ->orWhere('business_name', 'like', $like);
                });
            })
            ->with([
                'wallet:id,user_id,balance',
                'roles:id,name',
            ])
            ->withCount([
                'sentParcels as parcels_count',
                'recipients as recipients_count',
                'payments as payments_count',
                'merchantOrders as orders_count',
                'supplyRequests as supply_requests_count',
            ])
            ->latest('id')
            ->get()
            ->map(fn(User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified' => $user->email_verified_at !== null,
                'phone' => $user->phone,
                'phone_verified' => $user->phone_verified_at !== null,
                'business_name' => $user->business_name,
                'roles' => $user->roles->pluck('name')->values(),
                'wallet_balance' => (float) ($user->wallet?->balance ?? 0),
                'counts' => [
                    'parcels' => $user->parcels_count,
                    'recipients' => $user->recipients_count,
                    'payments' => $user->payments_count,
                    'orders' => $user->orders_count,
                    'supply_requests' => $user->supply_requests_count,
                ],
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'filters' => [
                'role' => $role,
                'q' => $q,
            ],
            'options' => [
                'roles' => [
                    'admin_staff' => 'Admin & Staff',
                    'admin' => 'Admin',
                    'staff' => 'Staff',
                    'merchant' => 'Merchant',
                    'customer' => 'Customer',
                ],
            ],
        ]);
    }

    public function create(Request $request)
    {
        $role = $request->query('role', 'staff');
        // "admin_staff" is a group, not a real assignable role.
        if ($role === 'admin_staff') {
            $role = 'staff';
        }

        return Inertia::render('admin/users/create', [
            'defaults' => [
                'role' => in_array($role, ['admin', 'staff', 'merchant', 'customer'], true)
                    ? $role
                    : 'staff',
            ],
            'options' => [
                'roles' => [
                    'staff' => 'Staff',
                    'admin' => 'Admin',
                    'merchant' => 'Merchant',
                    'customer' => 'Customer',
                ],
            ],
        ]);
    }

    public function store(Request $request, NotificationService $notifier)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20', 'unique:users,phone'],
            'business_name' => ['nullable', 'string', 'max:255'],
            'role' => ['required', Rule::in(['admin', 'staff', 'merchant', 'customer'])],
            'verify_email' => ['sometimes', 'boolean'],
        ]);

        // Readable-but-random password, e.g. "Kx7m-Pq2r" — 10 chars, mixed
        // case + digits + one separator. Easy to read out over a phone call.
        $plainPassword = Str::password(10, symbols: false, spaces: false);

        $user = DB::transaction(function () use ($validated, $plainPassword) {
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'business_name' => $validated['business_name'] ?? null,
                'password' => Hash::make($plainPassword),
                'email_verified_at' => !empty($validated['verify_email']) ? now() : null,
            ]);

            $user->assignRole($validated['role']);
            $user->walletOrCreate();

            return $user;
        });

        // Dispatch credentials outside the transaction — an SMS failure
        // must not roll the user back.
        $roleLabel = ucfirst($validated['role']);

        if ($user->phone) {
            $notifier->userCreated(
                $user->phone,
                $user->name,
                $plainPassword,
                $roleLabel,
            );
        } else {
            $notifier->userCreatedNoPhone(
                $user->name,
                $user->email,
                $plainPassword,
                $roleLabel,
            );
        }

        return redirect()
            ->route('admin.users.show', $user)
            ->with('success', "User {$user->name} created. Initial password: {$plainPassword}");
    }

    public function show(User $user)
    {
        $user->load([
            'wallet',
            'roles:id,name',
            'recipients' => fn($q) => $q->latest()->limit(20),
            'sentParcels' => fn($q) => $q->latest()->limit(20),
            'merchantOrders' => fn($q) => $q->latest()->limit(20),
            'supplyRequests' => fn($q) => $q->latest()->limit(20),
            'payments' => fn($q) => $q->latest()->limit(20),
            'parcelEvents' => fn($q) => $q->latest()->limit(20),
        ]);

        return Inertia::render('admin/users/show', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified' => $user->email_verified_at !== null,
                'phone' => $user->phone,
                'phone_verified' => $user->phone_verified_at !== null,
                'business_name' => $user->business_name,
                'roles' => $user->roles->pluck('name')->values(),
                'wallet_balance' => (float) ($user->wallet?->balance ?? 0),
                'created_at' => $user->created_at?->toIso8601String(),
                'two_factor' => $user->two_factor_confirmed_at !== null,
            ],
            'recipients' => $user->recipients->map(fn($r) => [
                'id' => $r->id,
                'name' => $r->name,
                'phone' => $r->phone,
            ]),
            'parcels' => $user->sentParcels->map(fn($p) => [
                'id' => $p->id,
                'tracking_no' => $p->tracking_no,
                'status' => $p->status,
                'total' => (float) $p->total,
            ]),
            'merchant_orders' => $user->merchantOrders->map(fn($o) => [
                'id' => $o->id,
                'status' => $o->status,
                'total' => (float) $o->total,
            ]),
            'supply_requests' => $user->supplyRequests->map(fn($s) => [
                'id' => $s->id,
                'status' => $s->status,
            ]),
            'payments' => $user->payments->map(fn($p) => [
                'id' => $p->id,
                'type' => $p->type,
                'status' => $p->status,
                'amount' => (float) $p->amount,
                'reference' => $p->reference,
                'created_at' => $p->created_at?->toIso8601String(),
            ]),
            'parcel_events' => $user->parcelEvents->map(fn($e) => [
                'id' => $e->id,
                'status' => $e->status,
                'created_at' => $e->created_at?->toIso8601String(),
            ]),
        ]);
    }
}