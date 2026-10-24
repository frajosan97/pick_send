// src/components/welcome/Community.tsx
import { Block } from "./Block";
import { SectionHead } from "./SectionHead";
import {
    CARD,
    CHECKS_BAND,
    G400,
    GHOST,
    H3,
    HINT,
    PAY,
    WRAP,
    waHref,
} from "./shared";

export function Community({ wa }: { wa: string }) {
    const displayPhone = wa || "0718 819 413";

    return (
        <Block id="community" tone="band">
            <div className={`${WRAP} ${G400} items-start gap-8 lg:gap-11`}>
                <div className="min-w-0">
                    <SectionHead
                        band
                        className="mb-3.5"
                        eyebrow="Community"
                        title="Join the movement on WhatsApp"
                        text="Book a parcel without leaving WhatsApp, and hear our news first. It is free to join and you can leave any time."
                    />
                    <ul className={CHECKS_BAND}>
                        <li>
                            <b>The group is for booking.</b> Drop your parcel
                            sending request there and we book it for you.
                        </li>
                        <li>
                            <b>The channel is for updates:</b> new towns, pickup
                            stations, offers and any delays.
                        </li>
                        <li>
                            <b>Prefer a private chat?</b> Message us directly
                            and we book it the same way.
                        </li>
                    </ul>
                </div>

                <div className={`${CARD} min-w-0`}>
                    <h3 className={`text-[clamp(1.1rem,2.2vw,1.25rem)] ${H3}`}>
                        Pick how you want to join
                    </h3>

                    <a
                        className={PAY}
                        target="_blank"
                        rel="noopener"
                        href={waHref(
                            wa,
                            "Hi Pick&Send, please add me to your WhatsApp group. I want to join the movement.",
                        )}
                    >
                        Join the group
                    </a>

                    <a
                        className={GHOST}
                        target="_blank"
                        rel="noopener"
                        href={waHref(
                            wa,
                            "Hi Pick&Send, please send me the link to your WhatsApp channel for updates.",
                        )}
                    >
                        Follow the channel for updates
                    </a>

                    <a
                        className={GHOST}
                        target="_blank"
                        rel="noopener"
                        href={waHref(
                            wa,
                            "Hi Pick&Send, please book a parcel for me.\n\nFrom (name and phone):\nPickup or drop-off:\nTo (name and phone):\nDestination town:\nWhat is inside and weight:\nEstimated worth:\nM-PESA number paying:",
                        )}
                    >
                        Book a parcel on WhatsApp
                    </a>

                    <span className={HINT}>
                        Call or WhatsApp {displayPhone}. We never ask for your
                        M-PESA PIN.
                    </span>
                </div>
            </div>
        </Block>
    );
}
