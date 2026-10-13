// src/components/pickandsend/Merchants.tsx
import { useForm, router } from "@inertiajs/react";
import { Block } from "./Block";
import { SectionHead } from "./SectionHead";
import { Fld, Table } from "./FormBits";
import {
    CARD,
    CHECKS,
    EYEBROW,
    G230,
    G400,
    GHOST,
    H3,
    HINT,
    M_PESA_BADGE,
    PAY,
    PILLS,
    PRIMARY,
    WRAP,
} from "./shared";
import type { AuthUser, Flash, MerchantData } from "./shared";
import { fmt } from "@/lib/pricing";

export function Merchants({
    user,
    merchant,
    flash,
}: {
    user: AuthUser | null;
    merchant: MerchantData | null;
    flash: Flash;
}) {
    const merchantUser = user?.is_merchant ? user : null;
    const otpForm = useForm({ phone: "", code: "" });
    const requestingOtp = flash?.otp_sent === true;

    const requestOtp = (e: React.FormEvent) => {
        e.preventDefault();
        otpForm.post("/merchant/otp", { preserveScroll: true });
    };
    const verifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        otpForm.post("/merchant/verify", { preserveScroll: true });
    };
    const logout = () =>
        router.post("/merchant/logout", {}, { preserveScroll: true });
    const withdraw = () =>
        router.post("/merchant/withdraw", {}, { preserveScroll: true });

    return (
        <Block id="merchants" tone="tint">
            <div className={WRAP}>
                <SectionHead
                    eyebrow="Merchants"
                    title="Your orders and your money in one place"
                    text="Sell with Cash on Delivery to customers across Kenya. Log in to see every order and your wallet."
                />
                {!merchantUser ? (
                    <div className={`${G400} items-start`}>
                        <ul className={CHECKS}>
                            <li>
                                <b>Your customer pays our M-PESA Till,</b> never
                                the agent and never in cash.
                            </li>
                            <li>
                                <b>Released only when</b> the code matches and
                                the payment is confirmed.
                            </li>
                            <li>
                                <b>Money in your wallet instantly,</b> less
                                1.6%. Withdraw to M-PESA any time.
                            </li>
                            <li>
                                <b>Free pickup from your CBD shop,</b> however
                                many parcels you send.
                            </li>
                            <li>
                                <b>Not collected in 7 days?</b> The parcel comes
                                back to you. A return fee applies.
                            </li>
                        </ul>
                        <form
                            className={CARD}
                            onSubmit={requestingOtp ? verifyOtp : requestOtp}
                        >
                            <h3 className={`text-[1.25rem] ${H3}`}>
                                Merchant log in
                            </h3>
                            <Fld
                                id="m-phone"
                                label="M-PESA phone number"
                                type="tel"
                                placeholder="07XX XXX XXX"
                                autoComplete="tel"
                                value={otpForm.data.phone}
                                onChange={(e: any) =>
                                    otpForm.setData("phone", e.target.value)
                                }
                                error={otpForm.errors.phone}
                            />
                            {requestingOtp && (
                                <Fld
                                    id="m-code"
                                    label="6-digit code we sent you"
                                    inputMode="numeric"
                                    value={otpForm.data.code}
                                    onChange={(e: any) =>
                                        otpForm.setData("code", e.target.value)
                                    }
                                    error={otpForm.errors.code}
                                />
                            )}
                            <button
                                className={PRIMARY}
                                type="submit"
                                disabled={otpForm.processing}
                            >
                                {otpForm.processing
                                    ? "Sending…"
                                    : requestingOtp
                                      ? "Verify and log in"
                                      : "Send code"}
                            </button>
                            <span className={HINT}>
                                We text you a code each time. No password to
                                remember.
                            </span>
                        </form>
                    </div>
                ) : (
                    <div className="rounded-[18px] border border-ps-line bg-ps-surface p-4 sm:p-6">
                        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <span className={EYEBROW}>Signed in</span>
                                <h3 className={`text-[1.3rem] ${H3}`}>
                                    {merchantUser.business_name ??
                                        merchantUser.name}
                                </h3>
                            </div>
                            <button
                                type="button"
                                className={`${GHOST} max-sm:!w-auto`}
                                onClick={logout}
                            >
                                Log out
                            </button>
                        </div>
                        <div className={G230}>
                            {(
                                [
                                    [
                                        "Wallet, ready to withdraw",
                                        fmt(merchant?.wallet ?? 0),
                                        null,
                                        true,
                                    ],
                                    [
                                        "Waiting for customers to collect",
                                        fmt(merchant?.waiting ?? 0),
                                        null,
                                        false,
                                    ],
                                    [
                                        "Withdrawn this month",
                                        fmt(merchant?.withdrawn_month ?? 0),
                                        null,
                                        false,
                                    ],
                                    [
                                        "Pick&Send points",
                                        String(merchant?.points ?? 0),
                                        "Worth KSh 1 off each on delivery",
                                        false,
                                    ],
                                ] as [string, string, string | null, boolean][]
                            ).map(([label, v, sub, main]) => (
                                <div
                                    key={label}
                                    className={`flex min-w-0 flex-col gap-1.5 rounded-[14px] border p-[18px] ${main ? "border-transparent bg-ps-soft" : "border-ps-line"}`}
                                >
                                    <span
                                        className={`text-[.9rem] font-semibold ${main ? "text-ps-softink" : "text-ps-muted"}`}
                                    >
                                        {label}
                                    </span>
                                    <b className="text-[1.7rem] leading-tight font-extrabold text-ps-brandink tabular-nums">
                                        {v}
                                    </b>
                                    {sub && <span className={HINT}>{sub}</span>}
                                    {main && (
                                        <>
                                            <button
                                                type="button"
                                                className={`${PAY} self-start`}
                                                onClick={withdraw}
                                                disabled={
                                                    (merchant?.wallet ?? 0) <= 0
                                                }
                                            >
                                                <span className={M_PESA_BADGE}>
                                                    M-PESA
                                                </span>
                                                Withdraw
                                            </button>
                                            {flash?.withdrawn && (
                                                <span
                                                    className={HINT}
                                                    role="status"
                                                >
                                                    Withdrawal sent to your
                                                    M-PESA.
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        <h3 className={`mt-[22px] mb-2.5 text-[1.3rem] ${H3}`}>
                            Orders
                        </h3>
                        <div className="overflow-x-auto rounded-[14px] border border-ps-line bg-ps-surface">
                            <Table
                                head={[
                                    "Tracking no.",
                                    "Recipient",
                                    "Town",
                                    "Status",
                                    "COD",
                                ]}
                                rows={(merchant?.orders ?? []).map((o) => (
                                    <tr key={o.tracking_no} className="group">
                                        <td className="border-b border-ps-line px-4 py-[13px] font-mono group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]">
                                            {o.tracking_no}
                                        </td>
                                        <td className="border-b border-ps-line px-4 py-[13px] group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]">
                                            {o.recipient_name}
                                        </td>
                                        <td className="border-b border-ps-line px-4 py-[13px] group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]">
                                            {o.town}
                                        </td>
                                        <td className="border-b border-ps-line px-4 py-[13px] group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]">
                                            <span
                                                className={
                                                    PILLS[
                                                        o.status === "at_pickup"
                                                            ? "wait"
                                                            : o.status ===
                                                                "in_transit"
                                                              ? "move"
                                                              : "done"
                                                    ]
                                                }
                                            >
                                                {o.status}
                                            </span>
                                        </td>
                                        <td className="border-b border-ps-line px-4 py-[13px] text-right group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]">
                                            {fmt(o.cod_amount)}
                                        </td>
                                    </tr>
                                ))}
                            />
                        </div>
                    </div>
                )}
            </div>
        </Block>
    );
}
