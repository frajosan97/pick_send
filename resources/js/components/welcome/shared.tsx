// src/components/pickandsend/shared.tsx
import { usePage } from "@inertiajs/react";
import type { AppConfig } from "@/types/pickandsend";

/* ---------- re-export types so existing imports keep working ---------- */
export type {
    PaymentOption,
    FlashParcelSummary,
    FlashBooking,
    FlashSupply,
    Flash,
    AppConfig,
} from "@/types/pickandsend";

/* ---------- shared class strings ---------- */
export const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-5";

export const BTN =
    "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-transparent px-6 text-center font-bold no-underline max-sm:w-full";

export const PRIMARY = `${BTN} bg-ps-brand text-ps-onbrand hover:opacity-90 transition-opacity`;
export const GHOST = `${BTN} border-ps-line bg-ps-surface text-ps-brandink hover:bg-ps-surface2 transition-colors`;
export const PAY = `${BTN} bg-ps-wa tracking-wide text-ps-onwa hover:opacity-90 transition-opacity`;

export const EYEBROW =
    "text-[.8rem] font-bold uppercase tracking-[.12em] text-ps-accent";

export const CARD =
    "flex flex-col gap-3.5 rounded-[18px] border border-ps-line bg-ps-surface p-4 text-ps-ink sm:p-6";

export const INPUT =
    "min-h-12 w-full rounded-[10px] border-[1.5px] border-ps-line bg-ps-surface px-3 text-ps-ink focus-visible:border-ps-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-brand/40";

export const HINT = "text-[.84rem] text-ps-muted";

export const ERR =
    "rounded-xl bg-ps-warn px-4 py-3 text-[.94rem] font-semibold text-ps-warnink";

export const H3 = "font-extrabold text-ps-brandink";

/* ---------- check lists (theme-safe in both modes) ---------- */

export const CHECKS = [
    "m-0 flex list-none flex-col gap-3 p-0",
    "text-[1.03rem] leading-relaxed text-ps-muted",
    "[&_b]:font-bold [&_b]:text-ps-ink",
].join(" ");

export const CHECKS_BAND = [
    "m-0 flex list-none flex-col gap-3 p-0",
    "text-[1.03rem] leading-relaxed text-ps-bandmuted",
    "[&_b]:font-bold [&_b]:text-ps-ink",
    "[&_li]:relative [&_li]:pl-8",
    "[&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-0.5",
    "[&_li]:before:flex [&_li]:before:h-5 [&_li]:before:w-5",
    "[&_li]:before:items-center [&_li]:before:justify-center",
    "[&_li]:before:rounded-full [&_li]:before:bg-ps-wa",
    "[&_li]:before:text-[.7rem] [&_li]:before:font-bold",
    "[&_li]:before:text-ps-onwa [&_li]:before:content-['✓']",
].join(" ");

export const TH = [
    "border-b border-ps-line px-4 py-[13px] text-left",
    "text-[.82rem] font-bold uppercase tracking-[.04em] text-ps-muted",
    "max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.66rem] max-sm:tracking-normal",
].join(" ");

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

/* ---------- badge ---------- */
export const M_PESA_BADGE =
    "rounded-[5px] bg-ps-onwa px-2 py-[3px] text-[.75rem] font-extrabold tracking-[.04em] whitespace-nowrap text-ps-wa";

/* ---------- auth / merchant / tracking ---------- */
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
    ["faq", "FAQ"],
];

/* ---------- shared app config hooks ---------- */

export function useAppConfig(): AppConfig {
    return usePage().props.config;
}

export function useWhatsApp(): string | null {
    return usePage().props.config.whatsapp;
}

/**
 * Builds a wa.me deep link.
 *
 * `wa.me` only accepts digits (country code + number, no "+", no spaces),
 * so we strip everything non-numeric. Returns "#" when the number is empty
 * after normalisation, so callers can safely use the return value in
 * `<a href>` without a null check.
 */
export function waHref(wa: string | null | undefined, text = ""): string {
    const digits = (wa ?? "").replace(/\D/g, "");
    if (!digits) return "#";
    const q = text ? `?text=${encodeURIComponent(text)}` : "";
    return `https://wa.me/${digits}${q}`;
}
