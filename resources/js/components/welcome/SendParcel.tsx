// src/components/pickandsend/SendParcel.tsx
import { useCallback, useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import type { Config } from "@/types/config";
import { fmt, makePricing, toNum } from "@/lib/pricing";
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
import type { FlashBooking, PaymentOption } from "./shared";

/**
 * Payment options that require an M-PESA number at booking time.
 * cod_full does not — the recipient pays everything at the door.
 */
const MPESA_REQUIRED_OPTIONS: ReadonlySet<PaymentOption> = new Set([
    "prepaid",
    "cod_fee",
]);

/**
 * Payment options that require a Cash-on-Delivery amount.
 */
const COD_REQUIRED_OPTIONS: ReadonlySet<PaymentOption> = new Set([
    "cod_fee",
    "cod_full",
]);

function firstErrorMessage(errors: Record<string, string>): string {
    const first = Object.values(errors)[0];
    return typeof first === "string" && first.length
        ? first
        : "Please check the form — some fields need attention.";
}

/**
 * Safely coerce booking.rows into an array of [label, value] pairs.
 */
function normaliseRows(
    rows: FlashBooking["rows"] | undefined | null,
): Array<[string, string]> {
    if (!Array.isArray(rows)) return [];
    return rows.reduce<Array<[string, string]>>((acc, row, i) => {
        if (!Array.isArray(row) || row.length < 2) return acc;
        const [k, v] = row;
        if (k === undefined || k === null) return acc;
        acc.push([String(k), v == null ? "" : String(v)]);
        return acc;
    }, []);
}

export function SendParcel({
    config,
    booking,
    error,
    paymentConfirmed,
    stkError,
}: {
    config: Config;
    booking: FlashBooking | null;
    error?: string;
    paymentConfirmed?: boolean;
    stkError?: string | null;
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
        // sender
        sname: "",
        sphone: "",
        hand: "drop",
        point: "cbd|Stanbank House, Moi Avenue, CBD",
        addr: "",
        count: "1",
        same: false,

        // recipient
        rname: "",
        rphone: "",
        rtown: "mount|Nyeri",

        // contents
        what: "",
        worth: "",
        kind: "g",
        size: "2",
        kg: "15",
        item: "acc",
        pack: false,

        // payment
        paynum: "",
        cod: "",
        payment_option: "prepaid" as PaymentOption,
    });

    const {
        data: f,
        setData: setF,
        errors: fErr,
        processing: sending,
        post: postParcel,
        clearErrors,
    } = parcelForm;

    const set = useCallback(
        (k: keyof typeof f, v: any) => setF(k as any, v),
        [setF],
    );
    const on = useCallback(
        (k: keyof typeof f) => (e: any) => setF(k as any, e.target.value),
        [setF],
    );

    const p = useMemo(() => pricing.price(f), [f, pricing]);
    const cod = toNum(f.cod);
    const total = p.total;

    // Mirror of PaymentService::amountDueNow()
    const amountDueNow = useMemo(() => {
        switch (f.payment_option) {
            case "prepaid":
                return total;
            case "cod_fee":
                return Math.max(0, total - cod);
            case "cod_full":
                return 0;
        }
    }, [f.payment_option, total, cod]);

    const needsMpesaNumber = MPESA_REQUIRED_OPTIONS.has(f.payment_option);
    const codRequired = COD_REQUIRED_OPTIONS.has(f.payment_option);

    const choosePaymentOption = useCallback(
        (option: PaymentOption) => {
            setF("payment_option", option);
            if (option === "cod_full") {
                setF("paynum", "");
                clearErrors("paynum");
            }
            if (option === "prepaid") {
                setF("cod", "");
                clearErrors("cod");
            }
            if (option !== "cod_full") {
                clearErrors("paynum");
            }
        },
        [setF, clearErrors],
    );

    const submitSend = (e?: React.FormEvent) => {
        e?.preventDefault();

        let outcome: "success" | "error" | "exception" = "exception";

        postParcel("/parcels", {
            preserveScroll: true,
            onError: (errors) => {
                outcome = "error";
                toast.error(firstErrorMessage(errors));
            },
            onSuccess: () => {
                outcome = "success";
                document
                    .getElementById("send-out")
                    ?.scrollIntoView({ block: "nearest" });
            },
            onFinish: () => {
                if (outcome === "exception") {
                    toast.error(
                        "Something went wrong on our side. Please try again.",
                    );
                }
            },
        });
    };

    const copyReceipt = async () => {
        if (!booking) return;
        try {
            await navigator.clipboard.writeText(booking.receipt ?? "");
            setCopied("Copied");
            setTimeout(() => setCopied(""), 2000);
        } catch {
            setCopied("Could not copy. Use the share button instead.");
        }
    };

    const showManualCode =
        !!booking && booking.amount_due_now > 0 && !booking.stk_sent;

    const payForm = useForm({ code: "" });
    const submitPay = (e: React.FormEvent) => {
        e.preventDefault();
        if (!booking) return;

        let outcome: "success" | "error" | "exception" = "exception";

        payForm.post(`/parcels/${booking.parcel.tracking_no}/confirm-payment`, {
            preserveScroll: true,
            onError: (errors) => {
                outcome = "error";
                toast.error(firstErrorMessage(errors));
            },
            onSuccess: () => {
                outcome = "success";
                payForm.reset();
            },
            onFinish: () => {
                if (outcome === "exception") {
                    toast.error("Could not submit the code. Please try again.");
                }
            },
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

    const receiptRows = useMemo(() => normaliseRows(booking?.rows), [booking]);

    const paynumLabel =
        f.payment_option === "cod_fee"
            ? "Your M-PESA number (to pay the delivery fee)"
            : "M-PESA number that will pay";
    const paynumHint =
        f.payment_option === "cod_fee"
            ? "We send the delivery-fee prompt to this number. The recipient pays for the goods on delivery."
            : "We send the M-PESA payment prompt to this number.";

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
                                <Choice label="Free professional packaging — want us to pack it for you?">
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
                                    Professional parcel packaging is provided
                                    free of charge.
                                </span>
                            </div>
                        </Part>
                    </div>

                    {/* ─── Payment method ─────────────────────────── */}
                    <Part n="4" title="Payment">
                        <Choice label="How would you like to pay?" cols={1}>
                            <Opt
                                type="radio"
                                name="payment_option"
                                checked={f.payment_option === "prepaid"}
                                onChange={() => choosePaymentOption("prepaid")}
                            >
                                Pay the full amount now via M-PESA
                            </Opt>
                            <Opt
                                type="radio"
                                name="payment_option"
                                checked={f.payment_option === "cod_fee"}
                                onChange={() => choosePaymentOption("cod_fee")}
                            >
                                Pay the delivery fee now, recipient pays the
                                goods on delivery (COD)
                            </Opt>
                            <Opt
                                type="radio"
                                name="payment_option"
                                checked={f.payment_option === "cod_full"}
                                onChange={() => choosePaymentOption("cod_full")}
                            >
                                Recipient pays everything on delivery (no M-PESA
                                now)
                            </Opt>
                        </Choice>

                        {needsMpesaNumber && (
                            <Fld
                                id="p-paynum"
                                label={paynumLabel}
                                type="tel"
                                placeholder="07XX XXX XXX"
                                autoComplete="off"
                                hint={paynumHint}
                                value={f.paynum}
                                onChange={on("paynum")}
                                error={fErr.paynum}
                            />
                        )}

                        {codRequired && (
                            <Fld
                                id="p-cod"
                                label="Cash on Delivery amount (KSh)"
                                inputMode="numeric"
                                placeholder="e.g. 5,000"
                                autoComplete="off"
                                hint={
                                    f.payment_option === "cod_fee"
                                        ? "The amount the recipient pays you for the goods on delivery."
                                        : "The full amount the recipient pays at the door (goods + delivery)."
                                }
                                value={f.cod}
                                onChange={on("cod")}
                                error={fErr.cod}
                            />
                        )}

                        {f.payment_option === "cod_full" && (
                            <p className="rounded-[10px] bg-ps-soft px-3.5 py-3 text-[.92rem] font-semibold text-ps-softink">
                                No M-PESA number is needed — the recipient pays
                                the full amount at the door.
                            </p>
                        )}
                    </Part>

                    {/* ─── Summary + submit ───────────────────────── */}
                    <div
                        className={`${G300} items-center rounded-2xl bg-ps-soft p-4 text-ps-softink sm:px-[22px] sm:py-5`}
                        aria-live="polite"
                    >
                        <div className="flex flex-col">
                            <span>Total to pay</span>
                            <output className="text-[1.9rem] leading-tight font-extrabold text-ps-brandink tabular-nums">
                                {fmt(total)}
                            </output>
                            <p className="text-[.94rem]">{breakdown(p)}</p>
                            <p className="text-[.94rem]">{codNote(cod)}</p>
                            <p className="text-[.94rem] font-bold">
                                {amountDueNow > 0
                                    ? `M-PESA prompt will ask for ${fmt(amountDueNow)}.`
                                    : "No M-PESA prompt — recipient pays on delivery."}
                            </p>
                            {codRequired && cod > 0 && (
                                <p className="text-[.94rem]">
                                    Recipient pays {fmt(cod)} on delivery.
                                </p>
                            )}
                            <p className="text-[.94rem] font-bold">
                                {`You earn ${p.points} Pick&Send points on this parcel.`}
                            </p>
                        </div>
                        <div className="flex min-w-0 flex-col gap-2.5">
                            <button
                                type="submit"
                                disabled={sending}
                                className={`${PAY} min-h-[60px] text-[1.1rem] font-extrabold disabled:opacity-60`}
                            >
                                {amountDueNow > 0 && (
                                    <span className={M_PESA_BADGE}>M-PESA</span>
                                )}
                                {sending
                                    ? "SENDING…"
                                    : amountDueNow > 0
                                      ? "PAY NOW"
                                      : "BOOK NOW"}
                            </button>
                            {booking?.receiptHref && (
                                <a
                                    className={`${BTN} min-h-12 border-ps-wa bg-ps-surface text-base text-ps-wa max-sm:px-2 max-sm:text-[.92rem]`}
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
                    {stkError && (
                        <p className={ERR} role="alert">
                            {stkError}
                        </p>
                    )}

                    {/* ─── Booking created flash ────────────────── */}
                    {booking && (
                        <div
                            id="send-out"
                            className="flex flex-col gap-3 rounded-2xl border-2 border-ps-wa bg-ps-surface p-4 sm:px-[22px] sm:py-5"
                        >
                            <div className="flex flex-col gap-2.5 rounded-[14px] bg-ps-band px-[18px] py-4 text-ps-bandmuted">
                                <span className={`${EYEBROW} !text-ps-key`}>
                                    {booking.who?.[0] ?? "Booked"}
                                </span>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                                    <span
                                        className="grid h-[52px] w-[52px] flex-none place-items-center rounded-full bg-ps-key font-extrabold text-ps-ink"
                                        aria-hidden="true"
                                    >
                                        PS
                                    </span>
                                    <div className="flex min-w-0 flex-1 basis-[180px] flex-col">
                                        <b className="text-ps-ink">
                                            {booking.who?.[1] ?? ""}
                                        </b>
                                        <span>{booking.who?.[2] ?? ""}</span>
                                    </div>
                                    <div className="flex flex-col items-end rounded-[10px] border-[1.5px] border-dashed border-ps-key px-3.5 py-1.5">
                                        <span className="text-[.75rem] font-bold tracking-[.08em] uppercase">
                                            Handover code
                                        </span>
                                        <b className="font-mono text-[1.7rem] tracking-[.18em] text-ps-ink">
                                            {booking.parcel?.handover_code ??
                                                "—"}
                                        </b>
                                    </div>
                                </div>
                                <p className="text-ps-ink">
                                    {booking.who?.[3] ?? ""}
                                </p>
                            </div>

                            {booking.amount_due_now > 0 && (
                                <div className="flex min-w-0 flex-col gap-3.5">
                                    <h3 className={`text-[1.3rem] ${H3}`}>
                                        Pay{" "}
                                        <span>
                                            {fmt(booking.amount_due_now)}
                                        </span>{" "}
                                        by M-PESA
                                    </h3>

                                    {booking.stk_sent && (
                                        <p className="rounded-[10px] bg-ps-soft px-3.5 py-3 text-[.92rem] font-semibold text-ps-softink">
                                            We sent an M-PESA prompt to{" "}
                                            <b>
                                                {booking.parcel?.payer_phone ??
                                                    "your phone"}
                                            </b>
                                            . Enter your PIN to pay{" "}
                                            {fmt(booking.amount_due_now)}. Your
                                            receipt updates automatically.
                                        </p>
                                    )}

                                    {showManualCode &&
                                        booking.parcel?.tracking_no && (
                                            <>
                                                <p className="rounded-[10px] bg-ps-soft px-3.5 py-3 text-[.92rem] font-semibold text-ps-softink">
                                                    The automatic prompt did not
                                                    go through. Pay manually
                                                    using the steps below, then
                                                    paste the M-PESA code.
                                                </p>
                                                <ol className="m-0 flex flex-col gap-1.5 pl-[22px]">
                                                    <li>
                                                        Open M-PESA, choose{" "}
                                                        <b>Lipa na M-PESA</b>,
                                                        then{" "}
                                                        <b>
                                                            Buy Goods and
                                                            Services
                                                        </b>
                                                        .
                                                    </li>
                                                    <li>
                                                        Enter Till number{" "}
                                                        <b className="font-mono">
                                                            [TILL NO.]
                                                        </b>
                                                        .
                                                    </li>
                                                    <li>
                                                        Enter{" "}
                                                        <b>
                                                            {fmt(
                                                                booking.amount_due_now,
                                                            )}
                                                        </b>{" "}
                                                        and your M-PESA PIN.
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
                                                        value={
                                                            payForm.data.code
                                                        }
                                                        onChange={(e: any) =>
                                                            payForm.setData(
                                                                "code",
                                                                e.target.value.toUpperCase(),
                                                            )
                                                        }
                                                        error={
                                                            payForm.errors.code
                                                        }
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={
                                                            payForm.processing
                                                        }
                                                        className={`${PRIMARY} self-start disabled:opacity-60`}
                                                    >
                                                        {payForm.processing
                                                            ? "Sending…"
                                                            : "Submit code for verification"}
                                                    </button>
                                                </form>
                                            </>
                                        )}
                                </div>
                            )}

                            {booking.amount_due_now === 0 && (
                                <p className="rounded-[10px] bg-ps-soft px-3.5 py-3 text-[.92rem] font-semibold text-ps-softink">
                                    No M-PESA payment is needed now. The
                                    recipient pays <b>{fmt(booking.total)}</b>{" "}
                                    on delivery.
                                </p>
                            )}

                            {paymentConfirmed && (
                                <p className="rounded-[10px] bg-ps-soft px-3.5 py-3 text-[.92rem] font-semibold text-ps-softink">
                                    Payment confirmed. The parcel will leave
                                    Nairobi once it is scanned in.
                                </p>
                            )}

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
                                            : booking.amount_due_now > 0
                                              ? "Awaiting M-PESA"
                                              : "Payment on delivery"}
                                    </span>
                                </div>
                                <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[.95rem] sm:grid-cols-[minmax(90px,auto)_1fr]">
                                    {receiptRows.length === 0 ? (
                                        <div className="contents">
                                            <dt className="text-ps-muted">
                                                Status
                                            </dt>
                                            <dd className="m-0 min-w-0 font-semibold break-words max-sm:mb-2">
                                                Booking recorded.
                                            </dd>
                                        </div>
                                    ) : (
                                        receiptRows.map(([k, v], i) => (
                                            <div
                                                key={`${k}-${i}`}
                                                className="contents"
                                            >
                                                <dt className="text-ps-muted">
                                                    {k}
                                                </dt>
                                                <dd className="m-0 min-w-0 font-semibold break-words max-sm:mb-2">
                                                    {v}
                                                </dd>
                                            </div>
                                        ))
                                    )}
                                </dl>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {booking.receiptHref && (
                                    <a
                                        className={PAY}
                                        href={booking.receiptHref}
                                        target="_blank"
                                        rel="noopener"
                                    >
                                        Share receipt on WhatsApp
                                    </a>
                                )}
                                {booking.bookingHref && (
                                    <a
                                        className={GHOST}
                                        href={booking.bookingHref}
                                        target="_blank"
                                        rel="noopener"
                                    >
                                        Send booking to Pick&amp;Send
                                    </a>
                                )}
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
                                booking to us on 0716 983 983 and we reply with
                                your tracking number.
                            </span>
                        </div>
                    )}
                </form>
            </div>
        </Block>
    );
}
