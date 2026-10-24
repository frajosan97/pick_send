// src/types/pickandsend.ts
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

/* ---------- shared app config (from HandleInertiaRequests) ---------- */
export type AppConfig = {
    whatsapp: string | null;
};