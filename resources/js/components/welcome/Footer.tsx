// src/components/pickandsend/Footer.tsx
import { Wordmark } from "./Wordmark";
import { WRAP } from "./shared";

export function Footer({ wa }: { wa: string }) {
    return (
        <footer
            className={[
                "bg-ps-band text-[.9rem] text-ps-bandmuted sm:text-[.94rem]",
                "pt-8 pb-6 sm:pt-11 sm:pb-7",
                // every link inside inherits the correct band-safe color
                "[&_a]:text-ps-ink [&_a]:underline-offset-2 [&_a]:hover:underline",
                // every <b> label inside flips correctly
                "[&_b]:mb-1.5 [&_b]:block [&_b]:text-ps-ink",
            ].join(" ")}
        >
            <div className={WRAP}>
                <div
                    className={[
                        "grid gap-6 sm:gap-7",
                        // 1 col < 480, 2 col < 768, 4 col above
                        "grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4",
                    ].join(" ")}
                >
                    {/* Brand */}
                    <div className="min-w-0">
                        <Wordmark onBand size="text-[1.4rem]" />
                        <p className="mt-2">
                            Parcels from Nairobi to towns across Kenya.
                        </p>
                    </div>

                    {/* Address */}
                    <address className="min-w-0 not-italic">
                        <b>Visit us</b>
                        <span className="block">
                            1st Floor, Stanbank House, Moi Avenue,
                        </span>
                        <span className="block">Nairobi CBD</span>
                        <span className="mt-1 block">
                            P.O. Box 25079-00100 GPO Nairobi
                        </span>
                    </address>

                    {/* Contact */}
                    <div className="min-w-0">
                        <b>Talk to us</b>
                        <span className="block">
                            Call or WhatsApp{" "}
                            <a
                                href={`https://wa.me/${wa}`}
                                rel="noopener"
                                target="_blank"
                            >
                                0716 983 983
                            </a>
                        </span>
                        <span className="mt-1 block">
                            <a href="#community">Join our WhatsApp community</a>
                        </span>
                        <span className="mt-1 block">
                            Nairobi CBD: open 7am to 8pm
                        </span>
                    </div>

                    {/* Payment */}
                    <div className="min-w-0">
                        <b>Pay</b>
                        <span className="block">M-PESA Till [TILL NO.]</span>
                        <span className="mt-1 block">
                            M-PESA only. No cash, no cards.
                        </span>
                    </div>
                </div>

                <div className="mt-6 border-t border-ps-bandline pt-4 text-[.82rem] sm:mt-7 sm:text-[.84rem]">
                    Neerabup Logistics Ltd trading as Pick&amp;Send
                </div>
            </div>
        </footer>
    );
}
