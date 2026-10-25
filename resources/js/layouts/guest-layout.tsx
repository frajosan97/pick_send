// src/layouts/guest-layout.tsx
import { useEffect, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import type { ReactNode } from "react";

import { TopStrip } from "@/components/welcome/TopStrip";
import { Header } from "@/components/welcome/Header";
import { SignedInBanner } from "@/components/welcome/SignedInBanner";
import { Footer } from "@/components/welcome/Footer";
import { FloatingWhatsApp } from "@/components/welcome/FloatingWhatsApp";

import { useWhatsApp, type AuthUser } from "@/components/welcome/shared";

export default function GuestLayout({ children }: { children: ReactNode }) {
    const page = usePage<{ auth: { user: AuthUser | null } }>();
    const { auth } = page.props;
    const wa = useWhatsApp() ?? "";

    // Check if the current Inertia component name starts with "merchants"
    const isMerchantPage = page.component.startsWith("merchants");

    const [menu, setMenu] = useState(false);
    const [typing, setTyping] = useState(false);

    useEffect(() => {
        const onResize = () => window.innerWidth >= 1024 && setMenu(false);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    return (
        <div
            className="min-h-screen scroll-smooth bg-ps-bg font-sans text-base leading-[1.55] text-ps-ink [&_h1]:text-balance [&_h2]:text-balance [&_h3]:text-balance"
            onFocusCapture={(e) =>
                /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) &&
                setTyping(true)
            }
            onBlurCapture={() => setTyping(false)}
        >
            <Head>
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
                />
            </Head>

            <TopStrip wa={wa} />
            <Header menu={menu} setMenu={setMenu} user={auth?.user ?? null} />

            {/* Only render the banner if we are NOT on a merchant page */}
            {!isMerchantPage && <SignedInBanner user={auth?.user ?? null} />}

            <main>{children}</main>

            <Footer wa={wa} />
            <FloatingWhatsApp typing={typing} />
        </div>
    );
}
