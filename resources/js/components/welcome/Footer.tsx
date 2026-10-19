// src/components/pickandsend/Footer.tsx
import { Wordmark } from "./Wordmark";
import { WRAP } from "./shared";

export function Footer({ wa }: { wa: string }) {
    return (
        <footer className="bg-ps-band pt-11 pb-7 text-[.94rem] text-ps-bandmuted [&_a]:text-white [&_b]:mb-1 [&_b]:block [&_b]:text-white">
            <div className={WRAP}>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(210px,100%),1fr))] gap-[26px]">
                    <div>
                        <Wordmark onBand size="text-[1.4rem]" />
                        <br />
                        Parcels from Nairobi to towns across Kenya.
                    </div>
                    <div>
                        <b>Visit us</b>1st Floor, Stanbank House, Moi Avenue,
                        Nairobi CBD
                        <br />
                        P.O. Box 25079-00100 GPO Nairobi
                    </div>
                    <div>
                        <b>Talk to us</b>Call or WhatsApp{" "}
                        <a href={`https://wa.me/${wa}`}>0716 983 983</a>
                        <br />
                        <a href="#community">
                            Join our WhatsApp community on 0716 983 983
                        </a>
                        <br />
                        Nairobi CBD: open 7am to 8pm
                    </div>
                    <div>
                        <b>Pay</b>M-PESA Till [TILL NO.]
                        <br />
                        M-PESA only. No cash, no cards.
                    </div>
                </div>
                <div className="mt-[26px] border-t border-ps-bandline pt-4 text-[.84rem]">
                    Neerabup Logistics Ltd trading as Pick&amp;Send
                </div>
            </div>
        </footer>
    );
}
