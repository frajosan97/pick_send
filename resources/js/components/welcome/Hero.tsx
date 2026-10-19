// src/components/pickandsend/Hero.tsx
import type { CSSProperties, ReactNode } from 'react';
import { SectionHead } from './SectionHead';
import {
    EYEBROW,
    FACTS,
    G400,
    GHOST,
    H3,
    PRIMARY,
    WRAP,
    waHref,
} from './shared';
import type { Config } from '@/types/config';
import { fmt } from '@/lib/pricing';

export function Hero({ config }: { config: Config }) {
    const { wa: WA, routes: ROUTES, towns: TOWNS } = config;

    const ROUTE_LIST = Object.entries(ROUTES).map(([key, name], i) => [
        key,
        name,
        (TOWNS.find(([k]) => k === key)?.[1] ?? []).join(' · '),
        ['#F08A5D', '#4FD1C0', '#E3B04B', '#7FB0F5'][i % 4],
    ]);

    const HOW: [string, string, ReactNode][] = [
        [
            'Book and pay',
            'M-PESA',
            <>
                <rect x="7" y="2.5" width="10" height="19" rx="2" />
                <path d="M11 18h2" />
            </>,
        ],
        [
            'Collect or drop off',
            'by 7pm',
            <>
                <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
                <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
            </>,
        ],
        [
            'Code collection',
            'by SMS',
            <>
                <rect x="5" y="10.5" width="14" height="10" rx="2" />
                <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </>,
        ],
        [
            'Get paid',
            'instantly, with COD',
            <>
                <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                <path d="M4 7V6a2 2 0 0 1 2-2h10v3M16 13.5h2" />
            </>,
        ],
    ];

    return (
        <section className="py-[26px_34px] md:py-[52px_56px]">
            <div className={`${WRAP} ${G400} items-center max-sm:gap-[26px]`}>
                <div className="flex min-w-0 flex-col gap-[18px]">
                    <span className={EYEBROW}>
                        The coast · the mountain · the Rift · the lake
                    </span>
                    <h1 className="text-[clamp(2.3rem,6vw,4.1rem)] leading-[1.01] font-extrabold tracking-[-.045em] text-ps-brandink">
                        Your business sells.
                        <br />
                        <em className="text-ps-accent not-italic">
                            We Pick &amp; Send.
                        </em>
                    </h1>
                    <p className="text-[1.25rem] leading-tight font-extrabold text-ps-brandink">
                        From just{' '}
                        <em className="text-[1.7rem] whitespace-nowrap text-ps-accent not-italic">
                            KSh 199
                        </em>
                        <br />
                        One price across all our towns in Kenya.
                    </p>
                    <p className="max-w-[34rem] text-[1.12rem] text-pretty text-ps-muted">
                        Send a parcel from Nairobi to towns across Kenya. For
                        shops, online sellers and{' '}
                        <b className="text-ps-ink">
                            anyone with something to send
                        </b>
                        . Professional packaging is free of charge.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <a className={PRIMARY} href="#send">
                            Send a parcel
                        </a>
                        <a className={GHOST} href="#track">
                            Track a parcel
                        </a>
                    </div>
                    <a
                        className="flex max-w-[34rem] items-center justify-between gap-3.5 rounded-[14px] bg-ps-brand px-5 py-4 text-ps-onbrand no-underline"
                        target="_blank"
                        rel="noopener"
                        href={waHref(
                            WA,
                            'Hi Pick&Send, I would like a quote for bulk items.',
                        )}
                    >
                        <span className="flex min-w-0 flex-col">
                            <b className="text-[1.3rem] leading-tight font-extrabold max-sm:text-[1.1rem]">
                                Sending bulk items? Get a quote.
                            </b>
                            <span className="text-[.95rem] font-semibold opacity-90">
                                Call or WhatsApp 0716 983 983
                            </span>
                        </span>
                        <i
                            className="flex-none text-[1.6rem] font-extrabold not-italic"
                            aria-hidden="true"
                        >
                            &rarr;
                        </i>
                    </a>
                    <ul className={FACTS}>
                        <li>Free pickup from CBD shops</li>
                        <li>Pay by M-PESA</li>
                        <li>Collected with an SMS code</li>
                        <li>Free professional packaging</li>
                    </ul>
                </div>

                <div className="flex min-w-0 flex-col gap-3.5">
                    <div
                        className="flex min-w-0 flex-col gap-1 rounded-[18px] border border-ps-line bg-ps-surface p-4 sm:px-6 sm:py-[22px]"
                        aria-labelledby="board-h"
                    >
                        <h2 id="board-h" className={`mb-2 text-[1.1rem] ${H3}`}>
                            Where we go
                        </h2>
                        <div className="flex items-center gap-2.5 pb-3 font-bold">
                            <i
                                className="h-5 w-5 flex-none rounded-full bg-ps-brand"
                                aria-hidden="true"
                            />
                            From Nairobi
                        </div>
                        <ul className="m-0 flex list-none flex-col p-0">
                            {ROUTE_LIST.map(([k, t, towns, c]) => (
                                <li
                                    key={k}
                                    style={{ '--rc': c } as CSSProperties}
                                    className="relative flex flex-col gap-0.5 border-t border-ps-line py-3.5 pl-[34px] before:absolute before:inset-y-0 before:left-2 before:w-1 before:bg-[var(--rc)] after:absolute after:top-[19px] after:left-px after:h-[18px] after:w-[18px] after:rounded-full after:border-4 after:border-[var(--rc)] after:bg-ps-surface"
                                >
                                    <b className={`text-[1.12rem] ${H3}`}>
                                        {t}
                                    </b>
                                    <span className="text-[.94rem] text-ps-muted">
                                        {towns}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div
                        className="rounded-[18px] border border-ps-line bg-ps-surface p-4 sm:px-[22px] sm:py-[18px]"
                        aria-labelledby="how-h"
                    >
                        <h2 id="how-h" className={`mb-3 text-[1.1rem] ${H3}`}>
                            How it works
                        </h2>
                        <ol className="relative m-0 grid list-none grid-cols-2 gap-x-2 gap-y-3.5 p-0 sm:grid-cols-4 sm:gap-2 sm:before:absolute sm:before:top-[21px] sm:before:right-[12%] sm:before:left-[12%] sm:before:h-[3px] sm:before:bg-ps-soft">
                            {HOW.map(([t, sub, icon]) => (
                                <li
                                    key={t}
                                    className="relative flex min-w-0 flex-col items-center gap-[3px] text-center"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                        className="mb-1 h-11 w-11 rounded-full bg-ps-soft fill-none stroke-ps-softink stroke-2 p-2.5 [stroke-linecap:round] [stroke-linejoin:round]"
                                    >
                                        {icon}
                                    </svg>
                                    <b className="text-[.88rem] leading-tight">
                                        {t}
                                    </b>
                                    <span className="text-[.78rem] leading-tight text-ps-muted">
                                        {sub}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </section>
    );
}
