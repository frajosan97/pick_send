// src/components/pickandsend/SendParcel.tsx
import { useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import type { Config } from "@/types/config";
import { fmt, makePricing, num, toNum } from "@/lib/pricing";
import { Block } from "./Block";
import { SectionHead } from "./SectionHead";
import { Choice, Fld, Opt, Part } from "./FormBits";
import {
    BTN,
    ERR,
    EYEBROW,
    G300,
    GHOST,
    H3,
    HINT,
    M_PESA_BADGE,
    PAY,
    PILLS,
    PRIMARY,
    WRAP,
} from "./shared";
import type { FlashBooking } from "./shared";

export function SendParcel({
    config,
    booking,
    error,
    paymentConfirmed,
}: {
    config: Config;
    booking: FlashBooking | null;
    error?: string;
    paymentConfirmed?: boolean;
}) {
    const pricing = useMemo(() => makePricing(config), [config]);
    const { breakdown, codNote } = pricing;
    const {
        towns: TOWNS,
        routes: ROUTES,
        general: GENERAL,
        elec: ELEC,
        constants,
    } = config;
    const {
        base10: BASE10,
        perKg: PER_KG,
        maxKg: MAX_KG,
        dropOffFee,
    } = constants;

    const [copied, setCopied] = useState("");

    const parcelForm = useForm({
        sname: "",
        sphone: "",
        hand: "drop",
        point: "cbd|Stanbank House, Moi Avenue, CBD",
        addr: "",
        count: "1",
        same: false,
        rname: "",
        rphone: "",
        rtown: "mount|Nyeri",
        what: "",
        worth: "",
        kind: "g",
        size: "2",
        kg: "15",
        item: "acc",
        pack: false,
        paynum: "",
        cod: "",
    });

    const {
        data: f,
        setData: setF,
        errors: fErr,
        processing: sending,
        post: postParcel,
    } = parcelForm;
    const set = (k: string, v: any) => setF(k as any, v);
    const on = (k: string) => (e: any) => setF(k as any, e.target.value);

    const p = useMemo(() => pricing.price(f), [f, pricing]);
    const cod = toNum(f.cod);

    const submitSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        postParcel("/parcels", {
            preserveScroll: true,
            onSuccess: () => {
                document
                    .getElementById("send-out")
                    ?.scrollIntoView({ block: "nearest" });
            },
        });
    };

    const copyReceipt = async () => {
        if (!booking) return;
        try {
            await navigator.clipboard.writeText(booking.receipt);
            setCopied("Copied");
            setTimeout(() => setCopied(""), 2000);
        } catch {
            setCopied("Could not copy. Use the share button instead.");
        }
    };

    const payForm = useForm({ code: "" });
    const submitPay = (e: React.FormEvent) => {
        e.preventDefault();
        if (!booking) return;
        payForm.post(`/parcels/${booking.tracking_no}/confirm-payment`, {
            preserveScroll: true,
            onSuccess: () => payForm.reset(),
        });
    };

    const townOptions = TOWNS.map(([r, list]) => (
        <optgroup key={r} label={ROUTES[r]}>
            {list.map((t) => (
                <option key={t} value={`${r}|${t}`}>
                    {t}
                </option>
            ))}
        </optgroup>
    ));

    return (
        <Block id="send">
            <div className={WRAP}>
                <SectionHead
                    eyebrow="Send with us"
                    title="Send a parcel"
                    text="Anyone can send. Tell us who it is from, who it is for and what it is. It takes about a minute."
                />
                <form
                    noValidate
                    className="flex flex-col gap-4"
                    onSubmit={submitSend}
                >
                    <div className={`${G300} items-start`}>
                        <Part n="1" title="Sender">
                            <Fld
                                id="s-name"
                                label="Your name or business"
                                autoComplete="name"
                                value={f.sname}
                                onChange={on("sname")}
                                error={fErr.sname}
                            />
                            <Fld
                                id="s-phone"
                                label="Your phone number"
                                type="tel"
                                placeholder="07XX XXX XXX"
                                autoComplete="tel"
                                value={f.sphone}
                                onChange={on("sphone")}
                                error={fErr.sphone}
                            />
                            <Choice label="How do we get your parcel?" cols={1}>
                                <Opt
                                    type="radio"
                                    name="hand"
                                    checked={f.hand === "drop"}
                                    onChange={() => set("hand", "drop")}
                                >
                                    I will bring it to you
                                </Opt>
                                <Opt
                                    type="radio"
                                    name="hand"
                                    checked={f.hand === "collect"}
                                    onChange={() => set("hand", "collect")}
                                >
                                    Come and pick it up from my CBD shop,{" "}
                                    <b>free</b>
                                </Opt>
                            </Choice>
                            <Fld
                                select
                                id="s-point"
                                label="Where will you drop it?"
                                hint="Bring it by 7pm."
                                hidden={p.mode === "collect"}
                                value={f.point}
                                onChange={on("point")}
                                error={fErr.point}
                            >
                                <optgroup label="Nairobi CBD">
                                    <option value="cbd|Stanbank House, Moi Avenue, CBD">
                                        Stanbank House, Moi Avenue, CBD (free)
                                    </option>
                                </optgroup>
                                <optgroup label="Around Nairobi">
                                    {config.satellites.map((t) => (
                                        <option
                                            key={t}
                                            value={`out|${t} agent`}
                                        >
                                            {t} agent ({fmt(dropOffFee)})
                                        </option>
                                    ))}
                                </optgroup>
                            </Fld>
                            <Fld
                                id="s-addr"
                                label="Where is your shop?"
                                placeholder="Building, floor, shop number and street"
                                hidden={p.mode !== "collect"}
                                hint="Have it ready for the rider, who waits up to 5 minutes."
                                value={f.addr}
                                onChange={on("addr")}
                                error={fErr.addr}
                            />
                            <Fld
                                id="s-count"
                                label="How many parcels today?"
                                inputMode="numeric"
                                autoComplete="off"
                                hidden={!(p.mode === "out" && p.share)}
                                hint={`The ${fmt(dropOffFee)} agent drop-off fee is paid once for all parcels today.`}
                                value={f.count}
                                onChange={on("count")}
                                error={fErr.count}
                            />
                            {p.mode === "out" && p.share && p.n >= 2 && (
                                <Opt
                                    type="checkbox"
                                    checked={f.same}
                                    onChange={(e: any) =>
                                        set("same", e.target.checked)
                                    }
                                >
                                    I already paid this on another parcel today
                                </Opt>
                            )}
                        </Part>

                        <Part n="2" title="Recipient">
                            <Fld
                                id="r-name"
                                label="Recipient's name"
                                value={f.rname}
                                onChange={on("rname")}
                                error={fErr.rname}
                            />
                            <Fld
                                id="r-phone"
                                label="Recipient's phone number"
                                type="tel"
                                placeholder="07XX XXX XXX"
                                hint="We text the collection code to this number."
                                value={f.rphone}
                                onChange={on("rphone")}
                                error={fErr.rphone}
                            />
                            <Fld
                                select
                                id="r-town"
                                label="Destination town"
                                value={f.rtown}
                                onChange={on("rtown")}
                                error={fErr.rtown}
                            >
                                {townOptions}
                            </Fld>
                            <p className="rounded-[10px] bg-ps-soft px-3.5 py-3 text-[.92rem] font-semibold text-ps-softink">
                                Collect at our pickup station in your nearest
                                town, using the SMS code.
                            </p>
                        </Part>

                        <Part n="3" title="Parcel">
                            <Fld
                                id="p-what"
                                label="What is inside?"
                                placeholder="e.g. clothes, phone, documents"
                                value={f.what}
                                onChange={on("what")}
                                error={fErr.what}
                            />
                            <Fld
                                id="p-worth"
                                label="Estimated worth of the parcel (KSh)"
                                inputMode="numeric"
                                placeholder="e.g. 5,000"
                                autoComplete="off"
                                hint="What the contents would cost to replace."
                                value={f.worth}
                                onChange={on("worth")}
                                error={fErr.worth}
                            />
                            <Choice label="What kind of parcel?">
                                <Opt
                                    type="radio"
                                    name="kind"
                                    checked={f.kind === "g"}
                                    onChange={() => set("kind", "g")}
                                >
                                    General
                                </Opt>
                                <Opt
                                    type="radio"
                                    name="kind"
                                    checked={f.kind === "e"}
                                    onChange={() => set("kind", "e")}
                                >
                                    Electronics
                                </Opt>
                            </Choice>
                            <Fld
                                select
                                id="p-size"
                                label="Weight"
                                hidden={f.kind === "e"}
                                value={f.size}
                                onChange={on("size")}
                                error={fErr.size}
                            >
                                {GENERAL.map((x) => (
                                    <option key={x.id} value={x.id}>
                                        {x.label}
                                    </option>
                                ))}
                            </Fld>
                            <Fld
                                id="p-kg"
                                label="How many kg?"
                                inputMode="numeric"
                                autoComplete="off"
                                hidden={f.kind === "e" || f.size !== "kg"}
                                hint={`KSh ${BASE10} for the first 10 kg, then KSh ${PER_KG} for every extra kg. Up to ${MAX_KG} kg.`}
                                value={f.kg}
                                onChange={on("kg")}
                                error={fErr.kg}
                            />
                            <Fld
                                select
                                id="p-item"
                                label="Which item?"
                                hint="Priced per item, with fragile handling included."
                                hidden={f.kind !== "e"}
                                value={f.item}
                                onChange={on("item")}
                                error={fErr.item}
                            >
                                {ELEC.map((g) => (
                                    <optgroup key={g.group} label={g.group}>
                                        {g.items.map((it) => (
                                            <option key={it.id} value={it.id}>
                                                {it.label}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </Fld>
                            <div className="flex flex-col gap-1.5">
                                <Choice label="Need packaging? We pack it for you at a small fee.">
                                    <Opt
                                        type="radio"
                                        name="pack"
                                        checked={!f.pack}
                                        onChange={() => set("pack", false)}
                                    >
                                        No, it is packed and ready
                                    </Opt>
                                    <Opt
                                        type="radio"
                                        name="pack"
                                        checked={f.pack}
                                        onChange={() => set("pack", true)}
                                    >
                                        Yes, pack it for me
                                    </Opt>
                                </Choice>
                                <span className={HINT}>
                                    {`Professional packaging for this item is ${fmt(p.item.pack)}. You only pay if you choose yes.`}
                                </span>
                            </div>
                            <Fld
                                id="p-paynum"
                                label="M-PESA number that will pay"
                                type="tel"
                                placeholder="07XX XXX XXX"
                                autoComplete="off"
                                hint="We send the M-PESA payment prompt to this number."
                                value={f.paynum}
                                onChange={on("paynum")}
                                error={fErr.paynum}
                            />
                            <Fld
                                id="p-cod"
                                label="Cash on Delivery amount (KSh)"
                                inputMode="numeric"
                                placeholder="Leave empty if already paid"
                                autoComplete="off"
                                hint="Only if the recipient must pay you for the goods."
                                value={f.cod}
                                onChange={on("cod")}
                                error={fErr.cod}
                            />
                        </Part>
                    </div>

                    {/* summary */}
                    <div
                        className={`${G300} items-center rounded-2xl bg-ps-soft p-4 text-ps-softink sm:px-[22px] sm:py-5`}
                        aria-live="polite"
                    >
                        <div className="flex flex-col">
                            <span>Total to pay</span>
                            <output className="text-[1.9rem] leading-tight font-extrabold text-ps-brandink tabular-nums">
                                {fmt(p.total)}
                            </output>
                            <p className="text-[.94rem]">{breakdown(p)}</p>
                            <p className="text-[.94rem]">{codNote(cod)}</p>
                            <p className="text-[.94rem] font-bold">
                                {`You earn ${p.points} Pick&Send points on this parcel.`}
                            </p>
                        </div>
                        <div className="flex min-w-0 flex-col gap-2.5">
                            <button
                                type="submit"
                                disabled={sending}
                                className={`${PAY} !min-h-[60px] !text-[1.1rem] !font-extrabold disabled:opacity-60`}
                            >
                                <span className={M_PESA_BADGE}>M-PESA</span>
                                {sending
                                    ? "SENDING…"
                                    : p.total > 0
                                      ? "PAY NOW"
                                      : "BOOK NOW"}
                            </button>
                            {booking && (
                                <a
                                    className={`${BTN} !min-h-12 border-ps-wa bg-ps-surface !text-base text-ps-wa max-sm:!px-2 max-sm:!text-[.92rem]`}
                                    target="_blank"
                                    rel="noopener"
                                    href={booking.receiptHref}
                                >
                                    Share receipt on WhatsApp
                                </a>
                            )}
                        </div>
                    </div>

                    {error && (
                        <p className={ERR} role="alert">
                            {error}
                        </p>
                    )}

                    {/* server flash: booking created */}
                    {booking && (
                        <div
                            id="send-out"
                            className="flex flex-col gap-3 rounded-2xl border-2 border-ps-wa bg-ps-surface p-4 sm:px-[22px] sm:py-5"
                        >
                            <div className="flex flex-col gap-2.5 rounded-[14px] bg-ps-band px-[18px] py-4 text-ps-bandmuted">
                                <span
                                    className={EYEBROW.replace(
                                        "text-ps-accent",
                                        "text-ps-key",
                                    )}
                                >
                                    {booking.who[0]}
                                </span>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                                    <span
                                        className="grid h-[52px] w-[52px] flex-none place-items-center rounded-full bg-ps-key font-extrabold text-ps-band"
                                        aria-hidden="true"
                                    >
                                        PS
                                    </span>
                                    <div className="flex min-w-0 flex-1 basis-[180px] flex-col">
                                        <b className="text-white">
                                            {booking.who[1]}
                                        </b>
                                        <span>{booking.who[2]}</span>
                                    </div>
                                    <div className="flex flex-col items-end rounded-[10px] border-[1.5px] border-dashed border-ps-key px-3.5 py-1.5">
                                        <span className="text-[.75rem] font-bold tracking-[.08em] uppercase">
                                            Handover code
                                        </span>
                                        <b className="font-mono text-[1.7rem] tracking-[.18em] text-white">
                                            {booking.handover_code}
                                        </b>
                                    </div>
                                </div>
                                <p className="text-white">{booking.who[3]}</p>
                            </div>

                            <div className="flex min-w-0 flex-col gap-3.5">
                                <h3 className={`text-[1.3rem] ${H3}`}>
                                    Pay <span>{fmt(booking.total)}</span> by
                                    M-PESA
                                </h3>
                                <ol className="m-0 flex flex-col gap-1.5 pl-[22px]">
                                    <li>
                                        Open M-PESA, choose{" "}
                                        <b>Lipa na M-PESA</b>, then{" "}
                                        <b>Buy Goods and Services</b>.
                                    </li>
                                    <li>
                                        Enter Till number{" "}
                                        <b className="font-mono">[TILL NO.]</b>.
                                    </li>
                                    <li>
                                        Enter <b>{fmt(booking.total)}</b> and
                                        your M-PESA PIN.
                                    </li>
                                </ol>
                                <form
                                    onSubmit={submitPay}
                                    className="flex flex-col gap-3"
                                >
                                    <Fld
                                        id="pay-code"
                                        label="M-PESA confirmation code"
                                        placeholder="e.g. SJK4XY12AB"
                                        autoComplete="off"
                                        hint="It is in the M-PESA message you get after paying."
                                        className="font-mono uppercase"
                                        value={payForm.data.code}
                                        onChange={(e: any) =>
                                            payForm.setData(
                                                "code",
                                                e.target.value.toUpperCase(),
                                            )
                                        }
                                        error={payForm.errors.code}
                                    />
                                    <button
                                        type="submit"
                                        disabled={payForm.processing}
                                        className={`${PRIMARY} self-start disabled:opacity-60`}
                                    >
                                        {payForm.processing
                                            ? "Confirming…"
                                            : "Confirm payment"}
                                    </button>
                                </form>
                                {paymentConfirmed && (
                                    <p className="rounded-[10px] bg-ps-soft px-3.5 py-3 text-[.92rem] font-semibold text-ps-softink">
                                        Payment confirmed. The parcel will leave
                                        Nairobi once it is scanned in.
                                    </p>
                                )}
                            </div>

                            {booking.custHref && (
                                <div className="flex flex-wrap gap-3">
                                    <a
                                        className={GHOST}
                                        href={booking.custHref}
                                        target="_blank"
                                        rel="noopener"
                                    >
                                        Also send the payment request on
                                        WhatsApp
                                    </a>
                                </div>
                            )}

                            <div
                                className="rounded-[14px] border-[1.5px] border-dashed border-ps-line bg-ps-surface2 px-[18px] py-4"
                                aria-labelledby="rcpt-h"
                            >
                                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-[1.1rem]">
                                    <b id="rcpt-h" className="text-ps-brandink">
                                        Receipt
                                    </b>
                                    <span
                                        className={
                                            booking.paid
                                                ? PILLS.done
                                                : PILLS.wait
                                        }
                                    >
                                        {booking.paid
                                            ? "Paid"
                                            : "Awaiting payment code"}
                                    </span>
                                </div>
                                <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[.95rem] sm:grid-cols-[minmax(90px,auto)_1fr]">
                                    {booking.rows.map(([k, v]) => (
                                        <div key={k} className="contents">
                                            <dt className="text-ps-muted">
                                                {k}
                                            </dt>
                                            <dd className="m-0 min-w-0 font-semibold break-words max-sm:mb-2">
                                                {v}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <a
                                    className={PAY}
                                    href={booking.receiptHref}
                                    target="_blank"
                                    rel="noopener"
                                >
                                    Share receipt on WhatsApp
                                </a>
                                <a
                                    className={GHOST}
                                    href={booking.bookingHref}
                                    target="_blank"
                                    rel="noopener"
                                >
                                    Send booking to Pick&amp;Send
                                </a>
                                <button
                                    type="button"
                                    className={GHOST}
                                    onClick={copyReceipt}
                                >
                                    Copy receipt
                                </button>
                                <span
                                    role="status"
                                    className="self-center font-semibold"
                                >
                                    {copied}
                                </span>
                            </div>
                            <span className={HINT}>
                                Share the receipt with the recipient. Send the
                                booking to us on 0718 819 413 and we reply with
                                your tracking number.
                            </span>
                        </div>
                    )}
                </form>
            </div>
        </Block>
    );
}
