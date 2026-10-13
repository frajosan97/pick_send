// src/components/pickandsend/Faq.tsx
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
                <div className="flex max-w-[46rem] flex-col gap-2.5">
                    {FAQ.map(([q, a], i) => (
                        <details
                            key={q}
                            open={i === 0}
                            className="rounded-xl border border-ps-line bg-ps-surface px-[18px]"
                        >
                            <summary className="flex min-h-[52px] cursor-pointer items-center font-bold">
                                {q}
                            </summary>
                            <p className="pb-4 text-ps-muted">{a}</p>
                        </details>
                    ))}
                </div>
            </div>
        </Block>
    );
}
