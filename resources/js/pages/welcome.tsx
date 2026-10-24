// src/pages/PickAndSend.tsx
import { useState } from "react";
import { Head, usePage } from "@inertiajs/react";

import type { Config } from "@/types/config";

import { TopStrip } from "@/components/welcome/TopStrip";
import { Header } from "@/components/welcome/Header";
import { Hero } from "@/components/welcome/Hero";
import { SendParcel } from "@/components/welcome/SendParcel";
import { Supplies } from "@/components/welcome/Supplies";
import { Merchants } from "@/components/welcome/Merchants";
import { Pricing } from "@/components/welcome/Pricing";
import { Track } from "@/components/welcome/Track";
import { Community } from "@/components/welcome/Community";
import { Faq } from "@/components/welcome/Faq";
import { Footer } from "@/components/welcome/Footer";
import { FloatingWhatsApp } from "@/components/welcome/FloatingWhatsApp";

import {
    useWhatsApp,
    type AuthUser,
    type Flash,
    type MerchantData,
} from "@/components/welcome/shared";

export default function PickAndSend() {
    const page = usePage<{
        pricing: Config;
        flash: Flash;
        auth: { user: AuthUser | null };
        merchant: MerchantData | null;
    }>();

    const { pricing, flash, auth, merchant } = page.props;

    const [menu, setMenu] = useState(false);
    const [typing, setTyping] = useState(false);

    const wa = useWhatsApp() ?? "";

    return (
        <div
            className="min-h-screen scroll-smooth bg-ps-bg font-sans text-base leading-[1.55] text-ps-ink [&_h1]:text-balance [&_h2]:text-balance [&_h3]:text-balance"
            onFocusCapture={(e) =>
                /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) &&
                setTyping(true)
            }
            onBlurCapture={() => setTyping(false)}
        >
            <Head title="Pick&Send">
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
                />
            </Head>

            <TopStrip wa={wa} />
            <Header menu={menu} setMenu={setMenu} />

            <main id="home">
                <Hero config={pricing} />
                <SendParcel
                    config={pricing}
                    booking={flash?.booking ?? null}
                    error={flash?.error}
                    paymentConfirmed={flash?.payment_confirmed}
                />
                <Supplies
                    config={pricing}
                    supply={flash?.supply ?? null}
                    error={flash?.error}
                />
                <Merchants
                    user={auth?.user ?? null}
                    merchant={merchant}
                    flash={flash}
                />
                <Pricing config={pricing} />
                <Track />
                <Community wa={wa} />
                <Faq config={pricing} />
            </main>

            <Footer wa={wa} />
            <FloatingWhatsApp typing={typing} />
        </div>
    );
}
