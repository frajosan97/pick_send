// src/components/welcome/Hero.tsx
import type { CSSProperties, ReactNode } from "react";
import {
    EYEBROW,
    FACTS,
    G400,
    GHOST,
    H3,
    PRIMARY,
    WRAP,
    waHref,
    usePhone,
} from "./shared";
import type { Config } from "@/types/config";

export function Hero({ config }: { config: Config }) {
    const { wa: WA, routes: ROUTES, towns: TOWNS } = config;

    // Pull the display phone number from the shared hook
    const displayPhone = usePhone();

    const ROUTE_LIST = Object.entries(ROUTES).map(([key, name], i) => [
        key,
        name,
        (TOWNS.find(([k]) => k === key)?.[1] ?? []).join(" · "),
        ["#F08A5D", "#4FD1C0", "#E3B04B", "#7FB0F5"][i % 4],
    ]);

    const HOW: [string, string, ReactNode][] = [
        [
            "Book and pay",
            "M-PESA",
            <>
                <rect x="7" y="2.5" width="10" height="19" rx="2" />
                <path d="M11 18h2" />
            </>,
        ],
        [
            "Collect or drop off",
            "by 7pm",
            <>
                <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
                <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
            </>,
        ],
        [
            "Code collection",
            "by SMS",
            <>
                <rect x="5" y="10.5" width="14" height="10" rx="2" />
                <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
            </>,
        ],
        [
            "Get paid",
            "instantly, with COD",
            <>
                <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                <path d="M4 7V6a2 2 0 0 1 2-2h10v3M16 13.5h2" />
            </>,
        ],
    ];

    return (
        <section className="py-8 sm:py-12 md:py-14 lg:py-16">
            <div
                className={`${WRAP} ${G400} items-start gap-8 sm:gap-10 lg:gap-12`}
            >
                <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
                    <span className={EYEBROW}>
                        The coast · the mountain · the Rift · the lake
                    </span>

                    <h1 className="text-[clamp(2rem,5.5vw,4.1rem)] leading-[1.02] font-extrabold tracking-[-.04em] text-balance text-ps-brandink">
                        Your business sells.
                        <br />
                        <em className="text-ps-accent not-italic">
                            We Pick &amp; Send.
                        </em>
                    </h1>

                    <p className="text-[clamp(1.05rem,2.4vw,1.25rem)] leading-snug font-extrabold text-balance text-ps-brandink">
                        From just{" "}
                        <em className="text-[clamp(1.35rem,3.4vw,1.7rem)] whitespace-nowrap text-ps-accent not-italic">
                            KSh 199
                        </em>
                        <br />
                        One price across all our towns in Kenya.
                    </p>

                    <p className="max-w-[34rem] text-[clamp(.98rem,1.6vw,1.12rem)] text-pretty text-ps-muted">
                        Send a parcel from Nairobi to towns across Kenya. For
                        shops, online sellers and{" "}
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
                        className="flex max-w-[34rem] items-center justify-between gap-3.5 rounded-[14px] bg-ps-brand px-4 py-3.5 text-ps-onbrand no-underline transition-opacity hover:opacity-95 sm:px-5 sm:py-4"
                        target="_blank"
                        rel="noopener"
                        href={waHref(
                            WA,
                            "Hi Pick&Send, I would like a quote for bulk items.",
                        )}
                    >
                        <span className="flex min-w-0 flex-col">
                            <b className="text-[clamp(1rem,2.4vw,1.3rem)] leading-tight font-extrabold">
                                Sending bulk items? Get a quote.
                            </b>
                            <span className="text-[clamp(.82rem,1.6vw,.95rem)] font-semibold opacity-90">
                                Call or WhatsApp {displayPhone}
                            </span>
                        </span>
                        <i
                            className="flex-none text-[1.4rem] font-extrabold not-italic sm:text-[1.6rem]"
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
                        className="flex min-w-0 flex-col gap-1 rounded-[18px] border border-ps-line bg-ps-surface p-4 sm:px-5 sm:py-5"
                        aria-labelledby="board-h"
                    >
                        <h2
                            id="board-h"
                            className={`mb-1.5 text-[1.05rem] sm:text-[1.1rem] ${H3}`}
                        >
                            Where we go
                        </h2>

                        <div className="flex items-center gap-2.5 pb-3 text-[.95rem] font-bold">
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
                                    style={{ "--rc": c } as CSSProperties}
                                    className={[
                                        "relative flex flex-col gap-0.5 border-t border-ps-line py-3 pl-8",
                                        "before:absolute before:inset-y-0 before:left-2 before:w-1 before:bg-[var(--rc)]",
                                        "after:absolute after:left-px after:top-[17px] after:h-4 after:w-4 after:rounded-full after:border-4 after:border-[var(--rc)] after:bg-ps-surface",
                                    ].join(" ")}
                                >
                                    <b
                                        className={`text-[clamp(1rem,2vw,1.12rem)] ${H3}`}
                                    >
                                        {t}
                                    </b>
                                    <span className="text-[clamp(.85rem,1.5vw,.94rem)] text-ps-muted">
                                        {towns}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div
                        className="rounded-[18px] border border-ps-line bg-ps-surface p-4 sm:px-5 sm:py-5"
                        aria-labelledby="how-h"
                    >
                        <h2
                            id="how-h"
                            className={`mb-3 text-[1.05rem] sm:text-[1.1rem] ${H3}`}
                        >
                            How it works
                        </h2>

                        <ol
                            className={[
                                "relative m-0 grid list-none gap-3 p-0",
                                "grid-cols-2 sm:grid-cols-4 sm:gap-2",
                                "sm:before:absolute sm:before:left-[12%] sm:before:right-[12%] sm:before:top-[21px] sm:before:h-[3px] sm:before:bg-ps-soft",
                            ].join(" ")}
                        >
                            {HOW.map(([t, sub, icon]) => (
                                <li
                                    key={t}
                                    className="relative flex min-w-0 flex-col items-center gap-1 text-center"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                        className="mb-1 h-10 w-10 rounded-full bg-ps-soft fill-none stroke-ps-softink stroke-2 p-2.5 [stroke-linecap:round] [stroke-linejoin:round] sm:h-11 sm:w-11"
                                    >
                                        {icon}
                                    </svg>
                                    <b className="text-[clamp(.8rem,1.4vw,.88rem)] leading-tight">
                                        {t}
                                    </b>
                                    <span className="text-[clamp(.72rem,1.2vw,.78rem)] leading-tight text-ps-muted">
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
