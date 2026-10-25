// src/components/welcome/Track.tsx
import { useState } from "react";
import { Block } from "./Block";
import { SectionHead } from "./SectionHead";
import { Fld } from "./FormBits";
import { ERR, EYEBROW, H3, PRIMARY, WRAP } from "./shared";
import type { TrackingData } from "./shared";
import { fmt } from "@/lib/pricing";

const TL_BASE =
    "relative pb-4 pl-8 last:pb-0 before:absolute before:left-0 before:top-[3px] before:h-[18px] before:w-[18px] before:rounded-full after:absolute after:-bottom-[3px] after:left-2 after:top-[21px] after:w-0.5 last:after:hidden";
const TL: Record<string, string> = {
    "": `${TL_BASE} before:bg-ps-accent after:bg-ps-accent`,
    now: `${TL_BASE} before:border-[5px] before:border-ps-brand before:bg-ps-surface after:bg-ps-line`,
    next: `${TL_BASE} before:border-2 before:border-ps-muted before:bg-ps-surface after:bg-ps-line`,
};

export function Track() {
    const [tNo, setTNo] = useState("");
    const [tracking, setTracking] = useState<TrackingData | null>(null);
    const [tErr, setTErr] = useState("");
    const [tLoading, setTLoading] = useState(false);

    const submitTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        setTErr("");
        setTracking(null);
        const code = tNo.trim();
        if (!code) {
            setTErr("Enter a tracking number.");
            return;
        }
        setTLoading(true);
        try {
            const res = await fetch(`/track/${encodeURIComponent(code)}`, {
                headers: { Accept: "application/json" },
            });
            if (!res.ok) {
                setTErr(
                    `We could not find that number. Check it and try again.`,
                );
            } else {
                setTracking(await res.json());
            }
        } catch {
            setTErr("Network error. Please try again.");
        } finally {
            setTLoading(false);
        }
    };

    return (
        <Block id="track" tone="tint">
            <div className={`${WRAP} flex flex-col gap-4`}>
                <SectionHead
                    eyebrow="Track a parcel"
                    title="Every step is a scan"
                    text="Enter your tracking number to see where your parcel is."
                />
                <form
                    className="flex flex-wrap items-end gap-2.5"
                    onSubmit={submitTrack}
                >
                    <div className="min-w-0 flex-[1_1_220px]">
                        <Fld
                            id="t-no"
                            label="Tracking number"
                            autoComplete="off"
                            className="font-mono uppercase"
                            placeholder="e.g. PS27010873"
                            value={tNo}
                            onChange={(e: any) =>
                                setTNo(e.target.value.toUpperCase())
                            }
                        />
                    </div>
                    <button
                        className={`${PRIMARY} max-sm:w-full`}
                        type="submit"
                        disabled={tLoading}
                    >
                        {tLoading ? "Searching…" : "Track"}
                    </button>
                </form>

                {tErr && <p className={ERR}>{tErr}</p>}

                {tracking && (
                    <div className="rounded-[18px] border border-ps-line bg-ps-surface p-4 sm:p-[22px]">
                        <span className={EYEBROW}>
                            Parcel {tracking.tracking_no}
                        </span>
                        <h3 className={`mb-1 text-[1.2rem] ${H3}`}>
                            Status: {tracking.status} · {tracking.town}
                        </h3>
                        <p className="text-ps-muted">
                            For {tracking.recipient_name}
                            {tracking.cod_amount > 0 &&
                                ` · Pay ${fmt(tracking.cod_amount)} by M-PESA at collection`}
                            .
                        </p>
                        <ol className="m-0 mt-4 list-none p-0">
                            {tracking.events.map((e, i) => (
                                <li
                                    key={i}
                                    className={
                                        TL[
                                            i === tracking.events.length - 1
                                                ? "now"
                                                : ""
                                        ]
                                    }
                                >
                                    <b className="block">{e.label}</b>
                                    <span className="text-[.9rem] text-ps-muted">
                                        {e.description} ·{" "}
                                        {new Date(
                                            e.happened_at,
                                        ).toLocaleString()}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        </Block>
    );
}
