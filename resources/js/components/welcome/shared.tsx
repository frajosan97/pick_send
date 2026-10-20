// src/components/pickandsend/shared.tsx
/* ---------- shared class strings ---------- */
export const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-5";
export const BTN =
    "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-transparent px-6 text-center font-bold no-underline max-sm:w-full";
export const PRIMARY = `${BTN} bg-ps-brand text-ps-onbrand`;
export const GHOST = `${BTN} border-ps-line bg-ps-surface text-ps-brandink`;
export const PAY = `${BTN} bg-ps-wa tracking-wide text-ps-onwa`;
export const EYEBROW =
    "text-[.8rem] font-bold uppercase tracking-[.12em] text-ps-accent";
export const CARD =
    "flex flex-col gap-3.5 rounded-[18px] border border-ps-line bg-ps-surface p-4 text-ps-ink sm:p-6";
export const INPUT =
    "min-h-12 w-full rounded-[10px] border-[1.5px] border-ps-line bg-ps-surface px-3 text-ps-ink";
export const HINT = "text-[.84rem] text-ps-muted";
export const ERR =
    "rounded-xl bg-ps-warn px-4 py-3 text-[.94rem] font-semibold text-ps-warnink";
export const H3 = "font-extrabold text-ps-brandink";
export const CHECKS =
    "m-0 flex list-none flex-col gap-3 p-0 text-[1.03rem] text-ps-muted [&_b]:text-ps-ink";
export const CHECKS_BAND =
    "m-0 flex list-none flex-col gap-3 p-0 text-[1.03rem] text-ps-bandmuted [&_b]:text-white";
export const TH =
    "border-b border-ps-line px-4 py-[13px] text-left text-[.82rem] font-bold uppercase tracking-[.04em] text-ps-muted max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.66rem] max-sm:tracking-normal";
export const TD =
    "border-b border-ps-line px-4 py-[13px] group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]";
export const G230 =
    "grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-3.5";
export const G300 =
    "grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4";
export const G400 =
    "grid grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] gap-11";
export const PILL =
    "inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] text-[.84rem] font-bold";
export const PILLS = {
    wait: `${PILL} bg-ps-warn text-ps-warnink`,
    move: `${PILL} bg-ps-surface2 text-ps-brandink`,
    done: `${PILL} bg-ps-soft text-ps-softink`,
};
export const FACTS =
    "m-0 flex list-none flex-wrap gap-x-[22px] gap-y-1.5 p-0 text-[.92rem] font-semibold text-ps-muted";

/* ---------- shared icon button class ---------- */
export const M_PESA_BADGE =
    "rounded-[5px] bg-ps-onwa px-2 py-[3px] text-[.75rem] font-extrabold tracking-[.04em] whitespace-nowrap text-ps-wa";

/* ---------- payment option union ---------- */
/**
 * Mirrors App\Models\Parcel::PAYMENT_OPTIONS.
 * Keep this list in sync with the backend enum.
 */
export type PaymentOption = "prepaid" | "cod_fee" | "cod_full";

/* ---------- parcel summary (canonical shape) ---------- */
/**
 * Mirrors App\Services\BookingService::summary().
 * Parcel-scoped data only — anything that describes the *booking event*
 * (receipts, WhatsApp links) lives on FlashBooking, not here.
 */
export type FlashParcelSummary = {
    tracking_no: string;
    handover_code: string;
    total: number;
    status: string;
    payment_option: PaymentOption;
    payer_phone: string | null;

    recipient_name: string;
    recipient_phone: string;
    recipient_town: string;

    is_paid: boolean;
    is_cod: boolean;
    balance_due: number;
};

/* ---------- booking flash (what POST /parcels returns) ---------- */
export type FlashBooking = {
    /** Parcel snapshot — receipt UI reads from here. */
    parcel: FlashParcelSummary;

    /** Delivery + COD totals (mirror of the parcel cache). */
    total: number;
    amount_due_now: number;
    amount_paid: number;
    payment_option: PaymentOption;

    /** Did the STK push actually reach the phone? */
    stk_sent: boolean;

    /** Fully paid (delivery fee only, or delivery + COD). */
    paid: boolean;

    /** Plain-text receipt body, for clipboard copy. */
    receipt?: string;

    /** Deep links — all per-booking, not per-parcel. */
    receiptHref?: string;
    bookingHref?: string;
    custHref?: string;

    /** Banner copy: eyebrow, title, subtitle, body. */
    who: [string, string, string, string];

    /** Receipt key/value rows (rendered as <dl>). */
    rows: [string, string][];
};

/* ---------- other flash payloads ---------- */
export type FlashSupply = { id: number; text: string; waHref: string };

export type Flash = {
    booking?: FlashBooking;
    supply?: FlashSupply;
    payment_confirmed?: boolean;
    stk_error?: string | null;
    otp_sent?: boolean;
    withdrawn?: boolean;
    success?: string;
    error?: string;
};

/* ---------- auth / merchant / tracking (unchanged) ---------- */
export type AuthUser = {
    id: number;
    name: string;
    phone: string;
    type: string;
    is_merchant: boolean;
    business_name: string | null;
};

export type MerchantData = {
    wallet: number;
    waiting: number;
    withdrawn_month: number;
    points: number;
    orders: {
        tracking_no: string;
        recipient_name: string;
        town: string;
        status: string;
        cod_amount: number;
    }[];
};

export type TrackingEvent = {
    label: string;
    description: string | null;
    happened_at: string;
};

export type TrackingData = {
    tracking_no: string;
    status: string;
    town: string;
    recipient_name: string;
    cod_amount: number;
    events: TrackingEvent[];
};

/* ---------- tiny shared props ---------- */
export type NavItem = [string, string];

export const NAV: NavItem[] = [
    ["send", "Send a parcel"],
    ["supplies", "Get supplies"],
    ["merchants", "Merchants"],
    ["pricing", "Pricing"],
    ["track", "Track"],
    ["community", "Community"],
    ["faq", "Questions"],
];

export function waHref(wa: string, text: string) {
    return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
}
