// src/components/welcome/Merchants.tsx
import { useState } from "react";
import { useForm, usePage } from "@inertiajs/react";
import { Block } from "./Block";
import { SectionHead } from "./SectionHead";
import { Fld } from "./FormBits";
import { CARD, CHECKS, G400, H3, HINT, PRIMARY, WRAP } from "./shared";
import { useWhatsApp } from "./shared";
import type { AuthUser, Flash } from "./shared";
import { MerchantSignupModal } from "./MerchantSignupModal";

export function Merchants({
    user,
    flash,
}: {
    user: AuthUser | null;
    flash: Flash;
}) {
    const [signupOpen, setSignupOpen] = useState(false);
    const wa = useWhatsApp();

    // Hooks must run unconditionally — early return is after all of them.
    const otpForm = useForm({ phone: "", code: "" });
    const pageErrors = usePage().props.errors as Record<
        string,
        string | undefined
    >;

    // Hide the entire section for signed-in merchants — the dashboard
    // lives on the /merchants route now, not here.
    if (user?.is_merchant) return null;

    const otpSent = flash?.otp_sent === true;
    const otpAttempted = flash?.otp_attempted === true;

    const sendError =
        pageErrors.otp ?? pageErrors.sms ?? otpForm.errors.phone ?? undefined;
    const codeError = otpForm.errors.code;

    const showCodeField = otpSent && !sendError;

    const requestOtp = (e: React.FormEvent) => {
        e.preventDefault();
        otpForm.post("/merchants/otp", { preserveScroll: true });
    };
    const verifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        otpForm.post("/merchants/verify", { preserveScroll: true });
    };

    const onSubmit = showCodeField ? verifyOtp : requestOtp;

    return (
        <Block id="merchants" tone="tint">
            <div className={WRAP}>
                <SectionHead
                    eyebrow="Merchants"
                    title="Your orders and your money in one place"
                    text="Sell with Cash on Delivery to customers across Kenya. Log in to see every order and your wallet."
                />

                <div className={`${G400} items-start gap-8 lg:gap-12`}>
                    <ul className={`${CHECKS} min-w-0`}>
                        <li>
                            <b>Your customer pays our M-PESA Till,</b> never the
                            agent and never in cash.
                        </li>
                        <li>
                            <b>Released only when</b> the code matches and the
                            payment is confirmed.
                        </li>
                        <li>
                            <b>Money in your wallet instantly,</b> less 1.6%.
                            Withdraw to M-PESA any time.
                        </li>
                        <li>
                            <b>Free pickup from your CBD shop,</b> however many
                            parcels you send.
                        </li>
                        <li>
                            <b>Not collected in 7 days?</b> The parcel comes
                            back to you. A return fee applies.
                        </li>
                    </ul>

                    <form className={`${CARD} min-w-0`} onSubmit={onSubmit}>
                        <h3
                            className={`text-[clamp(1.1rem,2.2vw,1.25rem)] ${H3}`}
                        >
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

                        {showCodeField && (
                            <Fld
                                id="m-code"
                                label="6-digit code we sent you"
                                inputMode="numeric"
                                value={otpForm.data.code}
                                onChange={(e: any) =>
                                    otpForm.setData("code", e.target.value)
                                }
                                error={codeError}
                            />
                        )}

                        <button
                            className={`${PRIMARY} w-full sm:w-auto`}
                            type="submit"
                            disabled={otpForm.processing}
                        >
                            {otpForm.processing
                                ? "Sending…"
                                : showCodeField
                                  ? "Verify and log in"
                                  : "Send code"}
                        </button>

                        {showCodeField && (
                            <span className={HINT} role="status">
                                Code sent. Check your messages.
                            </span>
                        )}
                        {otpAttempted && !showCodeField && !sendError && (
                            <span className={HINT} role="status">
                                If this number belongs to a merchant, a code is
                                on its way.
                            </span>
                        )}
                        {sendError && (
                            <span
                                className={`${HINT} text-ps-danger`}
                                role="alert"
                            >
                                {sendError}
                            </span>
                        )}
                        {!otpAttempted && !sendError && (
                            <span className={HINT}>
                                We text you a code each time. No password to
                                remember.
                            </span>
                        )}

                        {/* NEW: merchant signup CTA */}
                        <div className="mt-2 border-t border-ps-line pt-3">
                            <button
                                type="button"
                                onClick={() => setSignupOpen(true)}
                                className="text-left text-[.9rem] font-semibold text-ps-brandink underline-offset-2 hover:underline"
                            >
                                Become a merchant? Request via WhatsApp
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <MerchantSignupModal
                open={signupOpen}
                onClose={() => setSignupOpen(false)}
                whatsapp={wa}
            />
        </Block>
    );
}
