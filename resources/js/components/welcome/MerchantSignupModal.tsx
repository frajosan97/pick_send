// src/components/welcome/MerchantSignupModal.tsx
import { useEffect, useRef, useState } from "react";
import { Fld } from "./FormBits";
import { H3, HINT, PRIMARY, GHOST } from "./shared";
import { waHref } from "./shared";

type Props = {
    open: boolean;
    onClose: () => void;
    /** WhatsApp number from config, e.g. "254712345678" or null. */
    whatsapp: string | null;
};

export function MerchantSignupModal({ open, onClose, whatsapp }: Props) {
    const [form, setForm] = useState({
        name: "",
        phone: "",
        business: "",
        email: "",
        location: "",
    });
    const [sent, setSent] = useState(false);
    const firstFieldRef = useRef<HTMLInputElement | null>(null);

    // Focus first field when the modal opens; reset on close.
    useEffect(() => {
        if (open) {
            // Small delay so the element is mounted before focus.
            const t = setTimeout(() => firstFieldRef.current?.focus(), 50);
            return () => clearTimeout(t);
        }
        // Closing: reset everything for the next open.
        setForm({ name: "", phone: "", business: "", email: "", location: "" });
        setSent(false);
    }, [open]);

    // Escape to close.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    const set = <K extends keyof typeof form>(k: K, v: string) =>
        setForm((f) => ({ ...f, [k]: v }));

    // 1. Updated to use real line breaks (\n) instead of HTML breaks
    const buildMessage = () => {
        return [
            "Hi Pick&Send, I'd like to become a merchant.",
            "",
            `Full name: ${form.name.trim()}`,
            `M-PESA phone: ${form.phone.trim()}`,
            `Business name: ${form.business.trim()}`,
            form.email.trim() ? `Email: ${form.email.trim()}` : null,
            form.location.trim()
                ? `Business location: ${form.location.trim()}`
                : "Business location: online",
        ]
            .filter(Boolean)
            .join("\n"); // <--- literal newline
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Sanitize the target phone number
        let cleanWa = (whatsapp ?? "").replace(/\D/g, "");
        if (cleanWa.startsWith("0")) {
            cleanWa = "254" + cleanWa.substring(1);
        }

        if (!cleanWa) {
            alert(
                "Sorry — WhatsApp isn't configured yet. Please call us on 0718 819 413.",
            );
            return;
        }

        const text = encodeURIComponent(buildMessage());

        // 1. The API scheme: forces the desktop/mobile app to open the chat
        const appHref = `whatsapp://send?phone=${cleanWa}&text=${text}`;

        // 2. The web fallback: used if they don't have the app installed
        const webHref = `https://wa.me/${cleanWa}?text=${text}`;

        // Attempt to open the app. If the app is installed, the OS intercepts it.
        // If not, it fails silently and we redirect to the web version after 1 second.
        window.location.href = appHref;

        setTimeout(() => {
            window.open(webHref, "_blank", "noopener,noreferrer");
        }, 1000);

        setSent(true);
    };
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="merchant-signup-title"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <form
                onSubmit={onSubmit}
                className={`w-full max-w-lg rounded-t-2xl bg-ps-surface p-4 sm:rounded-2xl sm:p-6 flex flex-col gap-3.5`}
            >
                <h3
                    id="merchant-signup-title"
                    className={`text-[1.15rem] ${H3}`}
                >
                    Become a merchant
                </h3>
                <p className={`m-0 text-[.9rem] text-ps-muted`}>
                    Tell us about your business. We'll receive your details on
                    WhatsApp and get back to you with your merchant account.
                </p>

                {sent ? (
                    <>
                        <p className={`${HINT} text-ps-brandink font-semibold`}>
                            WhatsApp should now be open with your message. Send
                            it to finish your request.
                        </p>
                        <p className={HINT}>
                            Didn't open?{" "}
                            <a
                                href={waHref(whatsapp, buildMessage())}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold underline"
                            >
                                Click here to open WhatsApp
                            </a>
                            .
                        </p>
                        <button
                            type="button"
                            className={`${GHOST} w-full sm:w-auto`}
                            onClick={onClose}
                        >
                            Close
                        </button>
                    </>
                ) : (
                    <>
                        <Fld
                            id="signup-name"
                            label="Full name"
                            autoComplete="name"
                            value={form.name}
                            onChange={(e: any) => set("name", e.target.value)}
                            required
                        />
                        <Fld
                            id="signup-phone"
                            label="M-PESA phone number"
                            type="tel"
                            placeholder="07XX XXX XXX"
                            autoComplete="tel"
                            value={form.phone}
                            onChange={(e: any) => set("phone", e.target.value)}
                            required
                        />
                        <Fld
                            id="signup-business"
                            label="Business name"
                            autoComplete="organization"
                            value={form.business}
                            onChange={(e: any) =>
                                set("business", e.target.value)
                            }
                            required
                        />
                        <Fld
                            id="signup-email"
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            value={form.email}
                            onChange={(e: any) => set("email", e.target.value)}
                            required
                        />
                        <Fld
                            id="signup-location"
                            label="Business physical location (optional)"
                            placeholder="e.g. Nakuru CBD, or leave blank for online"
                            value={form.location}
                            onChange={(e: any) =>
                                set("location", e.target.value)
                            }
                        />

                        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                className={`${GHOST} w-full sm:w-auto`}
                                onClick={onClose}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`${PRIMARY} w-full sm:w-auto`}
                            >
                                Send via WhatsApp
                            </button>
                        </div>

                        <span className={HINT}>
                            We only use your details to set up your merchant
                            account.
                        </span>
                    </>
                )}
            </form>
        </div>
    );
}
