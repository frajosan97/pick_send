// src/components/pickandsend/TopStrip.tsx
import { WRAP, waHref } from "./shared";

export function TopStrip({ wa }: { wa: string }) {
    const displayPhone = wa || "0718 819 413";

    return (
        <div className="bg-ps-band py-1.5 text-[.78rem] text-ps-bandmuted sm:py-2 sm:text-[.85rem]">
            <div
                className={`${WRAP} flex flex-col items-center gap-y-0.5 text-center sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-6 sm:gap-y-1 sm:text-left`}
            >
                <span className="min-w-0">
                    Nairobi to <b className="text-ps-ink">Mombasa</b> ·{" "}
                    <b className="text-ps-ink">Mt Kenya</b> ·{" "}
                    <b className="text-ps-ink">North Rift</b> ·{" "}
                    <b className="text-ps-ink">Kisumu</b>
                </span>

                <span className="min-w-0">
                    <span className="hidden sm:inline">
                        Nairobi CBD open{" "}
                        <b className="text-ps-ink">7am to 8pm</b> ·{" "}
                    </span>
                    Call or WhatsApp{" "}
                    <a
                        className="font-semibold text-ps-brandink underline-offset-2 hover:underline"
                        href={waHref(wa)}
                        target="_blank"
                        rel="noopener"
                    >
                        <b>{displayPhone}</b>
                    </a>
                </span>
            </div>
        </div>
    );
}
