// src/components/welcome/Faq.tsx
import type { Config } from "@/types/config";
import { Block } from "./Block";
import { SectionHead } from "./SectionHead";
import { WRAP } from "./shared";

export function Faq({ config }: { config: Config }) {
    const { faq: FAQ } = config;

    return (
        <Block id="faq">
            <div className={WRAP}>
                <SectionHead
                    eyebrow="Questions"
                    title="What people ask first"
                />

                <div className="flex max-w-[46rem] flex-col gap-2.5 mt-4">
                    {FAQ.map(([q, a], i) => (
                        <details
                            key={`${i}-${q}`}
                            open={i === 0}
                            className={[
                                "group rounded-xl border border-ps-line bg-ps-surface",
                                "px-4 sm:px-[18px]",
                                // accent border when open — flips with theme
                                "open:border-ps-brand/60",
                                "transition-colors",
                            ].join(" ")}
                        >
                            <summary
                                className={[
                                    "flex min-h-[52px] cursor-pointer items-center justify-between gap-4",
                                    "list-none font-bold text-ps-ink",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ps-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ps-surface",
                                    // hide default marker in WebKit + Firefox
                                    "[&::-webkit-details-marker]:hidden [&::marker]:content-['']",
                                ].join(" ")}
                            >
                                <span className="min-w-0">{q}</span>
                                {/* Chevron rotates when open */}
                                <span
                                    aria-hidden="true"
                                    className={[
                                        "flex h-6 w-6 flex-none items-center justify-center rounded-full",
                                        "border border-ps-line text-ps-muted",
                                        "transition-transform duration-200",
                                        "group-open:rotate-180",
                                    ].join(" ")}
                                >
                                    <svg
                                        viewBox="0 0 20 20"
                                        className="h-3 w-3 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
                                    >
                                        <path d="m5 8 5 5 5-5" />
                                    </svg>
                                </span>
                            </summary>

                            <p className="m-0 max-w-[42rem] pb-4 text-[.94rem] leading-relaxed text-ps-muted sm:text-[.96rem]">
                                {a}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </Block>
    );
}
