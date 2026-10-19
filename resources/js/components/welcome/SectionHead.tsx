// src/components/pickandsend/SectionHead.tsx
import type { ReactNode } from 'react';
import { EYEBROW } from './shared';

export function SectionHead({
    eyebrow,
    title,
    text,
    dark,
    className = 'mb-6',
    children,
}: {
    eyebrow: string;
    title: string;
    text?: string;
    dark?: boolean;
    className?: string;
    children?: ReactNode;
}) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <span
                className={
                    dark
                        ? EYEBROW.replace('text-ps-accent', 'text-ps-key')
                        : EYEBROW
                }
            >
                {eyebrow}
            </span>
            <h2
                className={`text-[clamp(1.7rem,3.4vw,2.4rem)] leading-[1.1] font-extrabold tracking-[-.03em] ${dark ? 'text-white' : 'text-ps-brandink'}`}
            >
                {title}
            </h2>
            {text && (
                <p
                    className={`max-w-[40rem] ${dark ? 'text-ps-bandmuted' : 'text-ps-muted'}`}
                >
                    {text}
                </p>
            )}
            {children}
        </div>
    );
}
