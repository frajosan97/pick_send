// src/pages/welcome.tsx
import { Head, usePage } from "@inertiajs/react";
import type { Config } from "@/types/config";
import { Hero } from "@/components/welcome/Hero";
import { SendParcel } from "@/components/welcome/SendParcel";
import { Supplies } from "@/components/welcome/Supplies";
import { Merchants } from "@/components/welcome/Merchants";
import { Pricing } from "@/components/welcome/Pricing";
import { Track } from "@/components/welcome/Track";
import { Community } from "@/components/welcome/Community";
import { Faq } from "@/components/welcome/Faq";
import { useWhatsApp, type AuthUser, type Flash, type MerchantData } from "@/components/welcome/shared";

export default function PickAndSend() {
    const { pricing, flash, auth } = usePage<{
        pricing: Config;
        flash: Flash;
        auth: { user: AuthUser | null };
        merchant: MerchantData | null;
    }>().props;

    const wa = useWhatsApp() ?? "";

    return (
        <>
            <Head title="Pick&Send" />
            <div id="home">
                <Hero config={pricing} />
                <SendParcel config={pricing} booking={flash?.booking ?? null} error={flash?.error} paymentConfirmed={flash?.payment_confirmed} />
                <Supplies config={pricing} supply={flash?.supply ?? null} error={flash?.error} />
                <Merchants user={auth?.user ?? null} flash={flash} />
                <Pricing config={pricing} />
                <Track />
                <Community wa={wa} />
                <Faq config={pricing} />
            </div>
        </>
    );
}