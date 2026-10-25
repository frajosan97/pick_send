// src/components/welcome/SignedInBanner.tsx
import { EYEBROW, GHOST, HINT, WRAP } from "./shared";
import type { AuthUser } from "./shared";

export function SignedInBanner({ user }: { user: AuthUser | null }) {
    const merchant = user?.is_merchant ? user : null;
    if (!merchant) return null;

    const label = merchant.business_name ?? merchant.name;

    return (
        <div
            role="status"
            aria-live="polite"
            className="border-b border-ps-line bg-ps-soft text-ps-softink"
        >
            <div
                className={`${WRAP} flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2`}
            >
                <div className="flex min-w-0 items-center gap-2">
                    <span className={EYEBROW}>Signed in</span>
                    <span className="truncate text-[.92rem] font-semibold text-ps-ink">
                        {label}
                    </span>
                </div>

                <a
                    href="/merchants"
                    className={`${GHOST} min-h-9 px-3 text-[.84rem]`}
                >
                    Click to access merchant dashboard
                </a>
            </div>
        </div>
    );
}
