// src/components/pickandsend/Supplies.tsx
import { useForm } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Config } from "@/types/config";
import { Block } from "./Block";
import { SectionHead } from "./SectionHead";
import { Choice, Fld, Opt } from "./FormBits";
import {
    CARD,
    CHECKS_BAND,
    G400,
    H3,
    HINT,
    PAY,
    PRIMARY,
    WRAP,
} from "./shared";
import type { FlashSupply } from "./shared";

type Often = "once" | "daily" | "weekly" | "monthly";

const FREQUENCIES: { value: Often; label: string }[] = [
    { value: "once", label: "Once" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
];

const ALERT =
    "mb-4 rounded-2xl border-2 border-destructive/60 bg-destructive/10 p-4 text-sm text-foreground sm:px-5";

function firstErrorMessage(errors: Record<string, string>): string {
    const first = Object.values(errors)[0];
    return typeof first === "string" && first.length
        ? first
        : "Please check the form — some fields need attention.";
}

export function Supplies({
    config,
    supply,
    error,
}: {
    config: Config;
    supply: FlashSupply | null;
    error?: string;
}) {
    const { towns: TOWNS, routes: ROUTES } = config;

    const supplyForm = useForm({
        name: "",
        phone: "",
        town: "mount|Nyeri",
        what: "",
        from: "",
        sphone: "",
        often: "once" as Often,
    });
    const {
        data: s,
        setData: setS,
        errors: sErr,
        processing: sSending,
        post: postSupply,
        reset: resetSupply,
        clearErrors,
    } = supplyForm;

    const [showSuccess, setShowSuccess] = useState<boolean>(!!supply);

    useEffect(() => {
        setShowSuccess(!!supply);
    }, [supply]);

    const update = useCallback(
        <K extends keyof typeof s>(key: K, value: (typeof s)[K]) => {
            if (showSuccess) setShowSuccess(false);
            if (sErr[key]) clearErrors(key);
            setS(key, value as never);
        },
        [sErr, setS, clearErrors, showSuccess],
    );

    const submitSupplies = (e: React.FormEvent) => {
        e.preventDefault();
        setShowSuccess(false);

        let outcome: "success" | "error" | "exception" = "exception";

        postSupply("/supplies", {
            preserveScroll: true,
            onError: (errors) => {
                outcome = "error";
                toast.error(firstErrorMessage(errors));
            },
            onSuccess: () => {
                outcome = "success";
                const keepTown = s.town;
                resetSupply("name", "phone", "what", "from", "sphone");
                setS("town", keepTown);
                setShowSuccess(true);
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

    const townOptions = useMemo(
        () =>
            TOWNS.map(([r, list]) => (
                <optgroup key={r} label={ROUTES[r]}>
                    {list.map((t) => (
                        <option key={t} value={`${r}|${t}`}>
                            {t}
                        </option>
                    ))}
                </optgroup>
            )),
        [TOWNS, ROUTES],
    );

    const errorMessages = useMemo(
        () => Object.values(sErr).filter(Boolean) as string[],
        [sErr],
    );
    const hasErrors = errorMessages.length > 0;

    const isRecurring = s.often !== "once";

    return (
        <Block id="supplies" tone="band">
            <div className={`${WRAP} ${G400} items-start gap-8 lg:gap-12`}>
                <div className="min-w-0">
                    <SectionHead
                        band
                        className="mb-6"
                        eyebrow="Live outside Nairobi?"
                        title="Get your Nairobi supplies through Pick&Send"
                        text="Stock for your shop, spare parts, a phone you bought online. Tell us where to pick it and we bring it to your town, once or on a schedule."
                    />
                    <ul className={CHECKS_BAND}>
                        <li>
                            <b>We pick from shops in the Nairobi CBD.</b> One
                            collection fee covers everything from that supplier.
                        </li>
                        <li>
                            <b>Daily, weekly or monthly.</b> Set it once and
                            your supplies keep coming.
                        </li>
                        <li>
                            <b>You pay after we pick.</b> We send you the actual
                            price by SMS and you pay by M-PESA. Then we deliver.
                        </li>
                    </ul>
                </div>

                <form
                    className={`${CARD} min-w-0`}
                    noValidate
                    onSubmit={submitSupplies}
                    aria-busy={sSending}
                >
                    <h3 className={`text-[clamp(1.1rem,2.2vw,1.25rem)] ${H3}`}>
                        Ask us to pick for you
                    </h3>

                    {error && (
                        <p role="alert" className={ALERT}>
                            {error}
                        </p>
                    )}

                    {hasErrors && (
                        <div
                            role="alert"
                            aria-live="polite"
                            className={`${ALERT} flex flex-col gap-1`}
                        >
                            <b>We couldn’t send your request.</b>
                            <ul className="ml-4 list-disc">
                                {errorMessages.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <Fld
                        id="u-name"
                        label="Your name"
                        autoComplete="name"
                        value={s.name}
                        onChange={(e: any) => update("name", e.target.value)}
                        error={sErr.name}
                    />
                    <Fld
                        id="u-phone"
                        label="Your phone number"
                        type="tel"
                        placeholder="07XX XXX XXX"
                        autoComplete="tel"
                        inputMode="tel"
                        value={s.phone}
                        onChange={(e: any) => update("phone", e.target.value)}
                        error={sErr.phone}
                    />
                    <Fld
                        select
                        id="u-town"
                        label="Your town"
                        value={s.town}
                        onChange={(e: any) => update("town", e.target.value)}
                        error={sErr.town}
                    >
                        {townOptions}
                    </Fld>
                    <Fld
                        id="u-what"
                        label="What should we pick?"
                        placeholder="e.g. 2 cartons of cosmetics"
                        value={s.what}
                        onChange={(e: any) => update("what", e.target.value)}
                        error={sErr.what}
                    />
                    <Fld
                        id="u-from"
                        label="Where do we pick it?"
                        placeholder="Shop or supplier name, building and street"
                        value={s.from}
                        onChange={(e: any) => update("from", e.target.value)}
                        error={sErr.from}
                    />
                    <Fld
                        id="u-sphone"
                        label="Supplier's phone number"
                        type="tel"
                        placeholder="Optional"
                        inputMode="tel"
                        value={s.sphone}
                        onChange={(e: any) => update("sphone", e.target.value)}
                        error={sErr.sphone}
                    />

                    <Choice label="How often?" cols={4}>
                        {FREQUENCIES.map(({ value, label }) => (
                            <Opt
                                key={value}
                                type="radio"
                                name="often"
                                value={value}
                                checked={s.often === value}
                                onChange={() => update("often", value)}
                            >
                                {label}
                            </Opt>
                        ))}
                    </Choice>

                    {isRecurring && (
                        <p className="m-0 text-xs leading-relaxed text-ps-ink/70">
                            Recurring requests are quoted per delivery — you
                            approve the price each time before we dispatch.
                        </p>
                    )}

                    <button
                        className={`${PRIMARY} w-full sm:w-auto`}
                        type="submit"
                        disabled={sSending}
                    >
                        {sSending ? "Sending…" : "Request my pickup"}
                    </button>

                    {showSuccess && supply && (
                        <div
                            role="status"
                            aria-live="polite"
                            className="flex flex-col gap-3 rounded-2xl border-2 border-ps-wa/70 bg-ps-surface p-4 sm:px-5 sm:py-5"
                        >
                            <b>Request #{supply.id} received.</b>

                            <ol className="m-0 list-decimal pl-5 text-sm">
                                <li>
                                    We confirm the pickup with the supplier.
                                </li>
                                <li>We send you the quote by SMS.</li>
                                <li>You pay by M-PESA once you approve.</li>
                                <li>We deliver to your town.</li>
                            </ol>

                            <p className="m-0 text-sm">
                                Send this to us on WhatsApp: <b>0718 819 413</b>
                            </p>

                            <pre
                                className="m-0 overflow-x-auto rounded-[10px] bg-ps-surface2 p-3 font-sans text-[.92rem] whitespace-pre-wrap break-words select-all sm:p-3.5 sm:text-[.96rem]"
                                tabIndex={0}
                            >
                                {supply.text}
                            </pre>

                            <a
                                className={PAY}
                                href={supply.waHref}
                                target="_blank"
                                rel="noopener"
                            >
                                Open WhatsApp
                            </a>

                            <span className={HINT}>
                                Keep this number handy — we’ll SMS the quote
                                here.
                            </span>
                        </div>
                    )}
                </form>
            </div>
        </Block>
    );
}
