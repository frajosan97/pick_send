// src/components/pickandsend/SectionHead.tsx
import type { ReactNode } from "react";
import { EYEBROW } from "./shared";

type SectionHeadProps = {
    eyebrow: string;
    title: string;
    text?: string;
    band?: boolean;
    className?: string;
    children?: ReactNode;
};

export function SectionHead({
    eyebrow,
    title,
    text,
    band = false,
    className = "",
    children,
}: SectionHeadProps) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {/* Eyebrow: reuse the shared pill, swap only the accent when on a band */}
            <span className={band ? `${EYEBROW} !text-ps-key` : EYEBROW}>
                {eyebrow}
            </span>

            <h2
                className={[
                    "text-[clamp(1.5rem,3.4vw,2.4rem)]",
                    "leading-[1.1] font-extrabold tracking-[-.03em] text-balance",
                    band ? "text-ps-ink" : "text-ps-brandink",
                ].join(" ")}
            >
                {title}
            </h2>

            {text && (
                <p
                    className={[
                        "max-w-[40rem] text-pretty",
                        band ? "text-ps-bandmuted" : "text-ps-muted",
                    ].join(" ")}
                >
                    {text}
                </p>
            )}

            {children}
        </div>
    );
}
