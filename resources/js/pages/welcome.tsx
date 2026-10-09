import { useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import type { Config } from '@/types/config';
import { makePricing, fmt, num, toNum } from '@/lib/pricing';
import { ListIcon } from 'lucide-react';

/* ---------- shared class strings ---------- */
const WRAP = 'mx-auto w-full max-w-[1120px] px-4 sm:px-5';
const BTN =
    'inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-transparent px-6 text-center font-bold no-underline max-sm:w-full';
const PRIMARY = `${BTN} bg-ps-brand text-ps-onbrand`;
const GHOST = `${BTN} border-ps-line bg-ps-surface text-ps-brandink`;
const PAY = `${BTN} bg-ps-wa tracking-wide text-ps-onwa`;
const EYEBROW =
    'text-[.8rem] font-bold uppercase tracking-[.12em] text-ps-accent';
const CARD =
    'flex flex-col gap-3.5 rounded-[18px] border border-ps-line bg-ps-surface p-4 text-ps-ink sm:p-6';
const INPUT =
    'min-h-12 w-full rounded-[10px] border-[1.5px] border-ps-line bg-ps-surface px-3 text-ps-ink';
const HINT = 'text-[.84rem] text-ps-muted';
const ERR =
    'rounded-xl bg-ps-warn px-4 py-3 text-[.94rem] font-semibold text-ps-warnink';
const H3 = 'font-extrabold text-ps-brandink';
const CHECKS =
    'm-0 flex list-none flex-col gap-3 p-0 text-[1.03rem] text-ps-muted [&_b]:text-ps-ink';
const CHECKS_BAND =
    'm-0 flex list-none flex-col gap-3 p-0 text-[1.03rem] text-ps-bandmuted [&_b]:text-white';
const TH =
    'border-b border-ps-line px-4 py-[13px] text-left text-[.82rem] font-bold uppercase tracking-[.04em] text-ps-muted max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.66rem] max-sm:tracking-normal';
const TD =
    'border-b border-ps-line px-4 py-[13px] group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]';
const G230 =
    'grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-3.5';
const G300 =
    'grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4';
const G400 =
    'grid grid-cols-[repeat(auto-fit,minmax(min(400px,100%),1fr))] gap-11';
const PILL =
    'inline-block whitespace-nowrap rounded-full px-2.5 py-[3px] text-[.84rem] font-bold';
const PILLS = {
    wait: `${PILL} bg-ps-warn text-ps-warnink`,
    move: `${PILL} bg-ps-surface2 text-ps-brandink`,
    done: `${PILL} bg-ps-soft text-ps-softink`,
};

/* ---------- types ---------- */
type FlashBooking = {
    tracking_no: string;
    handover_code: string;
    total: number;
    receipt: string;
    receiptHref: string;
    bookingHref: string;
    custHref: string;
    who: [string, string, string, string];
    rows: [string, string][];
    paid: boolean;
};

type FlashSupply = { id: number; text: string; waHref: string };

type Flash = {
    booking?: FlashBooking;
    supply?: FlashSupply;
    payment_confirmed?: boolean;
    otp_sent?: boolean;
    withdrawn?: boolean;
    success?: string;
    error?: string;
};

type AuthUser = {
    id: number;
    name: string;
    phone: string;
    type: string;
    is_merchant: boolean;
    business_name: string | null;
};

type MerchantData = {
    wallet: number;
    waiting: number;
    withdrawn_month: number;
    points: number;
    orders: {
        tracking_no: string;
        recipient_name: string;
        town: string;
        status: string;
        cod_amount: number;
    }[];
};

type TrackingEvent = {
    label: string;
    description: string | null;
    happened_at: string;
};

type TrackingData = {
    tracking_no: string;
    status: string;
    town: string;
    recipient_name: string;
    cod_amount: number;
    events: TrackingEvent[];
};

/* ---------- small building blocks ---------- */
function Wordmark({
    onBand = false,
    size = 'text-[1.35rem]',
}: {
    onBand?: boolean;
    size?: string;
}) {
    const c = onBand ? 'bg-ps-key' : 'bg-ps-accent';
    return (
        <span className="inline-flex flex-col gap-[3px]">
            <span
                className={`${size} leading-none font-extrabold tracking-[-.03em] ${onBand ? 'text-white' : 'text-ps-brandink'}`}
            >
                Pick
                <i
                    className={`not-italic ${onBand ? 'text-ps-key' : 'text-ps-accent'}`}
                >
                    &amp;
                </i>
                Send
            </span>
            <span className="flex h-2.5 items-center" aria-hidden="true">
                <span
                    className={`h-[9px] w-[9px] flex-none rounded-full ${c}`}
                />
                <span className={`h-[3.5px] flex-1 ${c}`} />
                <span
                    className={`h-0 w-0 flex-none border-y-[5px] border-l-[9px] border-y-transparent ${onBand ? 'border-l-ps-key' : 'border-l-ps-accent'}`}
                />
            </span>
        </span>
    );
}

function Block({
    id,
    tone,
    children,
}: {
    id: string;
    tone?: 'tint' | 'band';
    children: React.ReactNode;
}) {
    const bg =
        tone === 'tint'
            ? 'bg-ps-surface2'
            : tone === 'band'
              ? 'bg-ps-band text-ps-bandmuted'
              : '';
    return (
        <section
            id={id}
            className={`scroll-mt-[76px] py-10 md:py-[60px] ${bg}`}
        >
            {children}
        </section>
    );
}

function SectionHead({
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
    children?: React.ReactNode;
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

function Fld({
    id,
    label,
    hint,
    error,
    hidden,
    select,
    children,
    className,
    ...rest
}: any) {
    if (hidden) return null;
    const err = typeof error === 'string' && error ? error : '';
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <label htmlFor={id} className="text-[.88rem] font-semibold">
                {label}
            </label>
            {select ? (
                <select
                    id={id}
                    className={`${INPUT} ${err ? 'border-ps-warn' : ''}`}
                    {...rest}
                >
                    {children}
                </select>
            ) : (
                <input
                    id={id}
                    className={`${INPUT} ${err ? 'border-ps-warn' : ''} ${className ?? ''}`}
                    aria-invalid={!!err}
                    {...rest}
                />
            )}
            {err ? (
                <span className="text-[.84rem] font-semibold text-ps-warnink">
                    {err}
                </span>
            ) : (
                hint && <span className={HINT}>{hint}</span>
            )}
        </div>
    );
}

function Choice({
    label,
    children,
    cols = 2,
}: {
    label: React.ReactNode;
    children: React.ReactNode;
    cols?: 1 | 2 | 4;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[.88rem] font-semibold">{label}</span>
            <div
                role="radiogroup"
                className={`grid gap-2 ${cols === 1 ? 'grid-cols-1' : cols === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}
            >
                {children}
            </div>
        </div>
    );
}

function Opt({ children, className = '', ...input }: any) {
    return (
        <label
            className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] border-ps-line px-3 py-1.5 text-[.92rem] font-semibold has-[:checked]:border-ps-accent has-[:checked]:bg-ps-soft has-[:checked]:text-ps-softink ${className}`}
        >
            <input
                className="h-[18px] w-[18px] flex-none accent-[#4FD1C0]"
                {...input}
            />
            <span>{children}</span>
        </label>
    );
}

function Part({
    n,
    title,
    children,
}: {
    n: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-ps-line bg-ps-surface p-4 sm:p-[22px]">
            <div className={`flex items-center gap-2.5 text-[1.2rem] ${H3}`}>
                <i className="grid h-[30px] w-[30px] place-items-center rounded-full bg-ps-brand text-[.95rem] text-ps-onbrand not-italic">
                    {n}
                </i>
                {title}
            </div>
            {children}
        </div>
    );
}

function Table({
    head,
    rows,
    small,
}: {
    head: string[];
    rows: React.ReactNode;
    small?: boolean;
}) {
    return (
        <table
            className={`w-full border-collapse tabular-nums ${small ? '' : 'min-w-[560px] max-sm:min-w-0'}`}
        >
            <thead>
                <tr>
                    {head.map((h, i) => (
                        <th
                            key={h}
                            className={`${TH} ${i ? 'text-right' : ''}`}
                        >
                            {h}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>{rows}</tbody>
        </table>
    );
}

const FACTS =
    'm-0 flex list-none flex-wrap gap-x-[22px] gap-y-1.5 p-0 text-[.92rem] font-semibold text-ps-muted';

/* ---------- page ---------- */
export default function PickAndSend() {
    const page = usePage<{
        config: Config;
        flash: Flash;
        auth: { user: AuthUser | null };
        merchant: MerchantData | null;
    }>();

    const { config, flash, auth, merchant } = page.props;

    const pricing = useMemo(() => makePricing(config), [config]);
    const { price, breakdown, codNote, kgPrice } = pricing;

    const {
        wa: WA,
        routes: ROUTES,
        towns: TOWNS,
        satellites: SATELLITES,
        general: GENERAL,
        elec: ELEC,
        faq: FAQ,
        constants,
    } = config;
    const {
        base10: BASE10,
        perKg: PER_KG,
        maxKg: MAX_KG,
        dropOffFee,
    } = constants;

    const wa = (text: string) =>
        `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

    const [menu, setMenu] = useState(false);
    const [typing, setTyping] = useState(false);
    const [copied, setCopied] = useState('');

    /* ============ PARCEL FORM ============ */
    const parcelForm = useForm({
        sname: '',
        sphone: '',
        hand: 'drop',
        point: 'cbd|Stanbank House, Moi Avenue, CBD',
        addr: '',
        count: '1',
        same: false,
        rname: '',
        rphone: '',
        rtown: 'mount|Nyeri',
        what: '',
        worth: '',
        kind: 'g',
        size: '2',
        kg: '15',
        item: 'acc',
        pack: false,
        paynum: '',
        cod: '',
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

    const p = useMemo(() => price(f), [f, pricing]);
    const cod = toNum(f.cod);

    const b: FlashBooking | null = flash?.booking ?? null;

    const submitSend = (e?: React.FormEvent) => {
        e?.preventDefault();
        postParcel('/parcels', {
            preserveScroll: true,
            onSuccess: () => {
                document
                    .getElementById('send-out')
                    ?.scrollIntoView({ block: 'nearest' });
            },
        });
    };

    const copyReceipt = async () => {
        if (!b) return;
        try {
            await navigator.clipboard.writeText(b.receipt);
            setCopied('Copied');
            setTimeout(() => setCopied(''), 2000);
        } catch {
            setCopied('Could not copy. Use the share button instead.');
        }
    };

    /* ============ PAYMENT CODE FORM ============ */
    const payForm = useForm({ code: '' });
    const submitPay = (e: React.FormEvent) => {
        e.preventDefault();
        if (!b) return;
        payForm.post(`/parcels/${b.tracking_no}/confirm-payment`, {
            preserveScroll: true,
            onSuccess: () => payForm.reset(),
        });
    };

    /* ============ SUPPLIES FORM ============ */
    const supplyForm = useForm({
        name: '',
        phone: '',
        town: 'mount|Nyeri',
        what: '',
        from: '',
        sphone: '',
        often: 'Once',
    });
    const {
        data: s,
        errors: sErr,
        processing: sSending,
        post: postSupply,
    } = supplyForm;
    const setS = (k: string, v: any) => supplyForm.setData(k as any, v);

    const submitSupplies = (e: React.FormEvent) => {
        e.preventDefault();
        postSupply('/supplies', { preserveScroll: true });
    };

    const supply = flash?.supply ?? null;

    /* ============ MERCHANT (OTP) ============ */
    const merchantUser = auth?.user?.is_merchant ? auth.user : null;
    const otpForm = useForm({ phone: '', code: '' });
    const requestingOtp = flash?.otp_sent === true;

    const requestOtp = (e: React.FormEvent) => {
        e.preventDefault();
        otpForm.post('/merchant/otp', { preserveScroll: true });
    };
    const verifyOtp = (e: React.FormEvent) => {
        e.preventDefault();
        otpForm.post('/merchant/verify', { preserveScroll: true });
    };
    const logout = () =>
        router.post('/merchant/logout', {}, { preserveScroll: true });
    const withdraw = () =>
        router.post('/merchant/withdraw', {}, { preserveScroll: true });

    /* ============ TRACKING ============ */
    const [tNo, setTNo] = useState('');
    const [tracking, setTracking] = useState<TrackingData | null>(null);
    const [tErr, setTErr] = useState('');
    const [tLoading, setTLoading] = useState(false);

    const submitTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        setTErr('');
        setTracking(null);
        const code = tNo.trim();
        if (!code) {
            setTErr('Enter a tracking number.');
            return;
        }
        setTLoading(true);
        try {
            const res = await fetch(`/track/${encodeURIComponent(code)}`, {
                headers: { Accept: 'application/json' },
            });
            if (!res.ok) {
                setTErr(
                    `We could not find that number. Check it and try again.`,
                );
            } else {
                setTracking(await res.json());
            }
        } catch {
            setTErr('Network error. Please try again.');
        } finally {
            setTLoading(false);
        }
    };

    /* ============ derived data ============ */
    const townOptions = TOWNS.map(([r, list]) => (
        <optgroup key={r} label={ROUTES[r]}>
            {list.map((t) => (
                <option key={t} value={`${r}|${t}`}>
                    {t}
                </option>
            ))}
        </optgroup>
    ));

    const NAV: [string, string][] = [
        ['send', 'Send a parcel'],
        ['supplies', 'Get supplies'],
        ['merchants', 'Merchants'],
        ['pricing', 'Pricing'],
        ['track', 'Track'],
        ['community', 'Community'],
        ['faq', 'Questions'],
    ];

    const ROUTE_LIST = Object.entries(ROUTES).map(([key, name], i) => [
        key,
        name,
        (TOWNS.find(([k]) => k === key)?.[1] ?? []).join(' · '),
        ['#F08A5D', '#4FD1C0', '#E3B04B', '#7FB0F5'][i % 4],
    ]);

    const HOW = [
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
    ] as [string, string, React.ReactNode][];

    const TL_BASE =
        'relative pb-4 pl-8 last:pb-0 before:absolute before:left-0 before:top-[3px] before:h-[18px] before:w-[18px] before:rounded-full after:absolute after:-bottom-[3px] after:left-2 after:top-[21px] after:w-0.5 last:after:hidden';
    const TL: Record<string, string> = {
        '': `${TL_BASE} before:bg-ps-accent after:bg-ps-accent`,
        now: `${TL_BASE} before:border-[5px] before:border-ps-brand before:bg-ps-surface after:bg-ps-line`,
        next: `${TL_BASE} before:border-2 before:border-ps-muted before:bg-ps-surface after:bg-ps-line`,
    };

    return (
        <div
            className="min-h-screen scroll-smooth bg-ps-bg font-sans text-base leading-[1.55] text-ps-ink [color-scheme:dark] [&_h1]:text-balance [&_h2]:text-balance [&_h3]:text-balance"
            onFocusCapture={(e) =>
                /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) &&
                setTyping(true)
            }
            onBlurCapture={() => setTyping(false)}
        >
            <Head title="Pick&Send">
                <link
                    rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
                />
            </Head>

            {/* top strip */}
            <div className="bg-ps-band py-2 text-[.85rem] text-ps-bandmuted max-sm:py-1.5 max-sm:text-[.78rem]">
                <div
                    className={`${WRAP} flex flex-wrap justify-between gap-x-6 gap-y-1`}
                >
                    <span>
                        Nairobi to <b className="text-white">Mombasa</b> ·{' '}
                        <b className="text-white">Mt Kenya</b> ·{' '}
                        <b className="text-white">North Rift</b> ·{' '}
                        <b className="text-white">Kisumu</b>
                    </span>
                    <span>
                        <span className="max-sm:hidden">
                            Nairobi CBD open{' '}
                            <b className="text-white">7am to 8pm</b> ·{' '}
                        </span>
                        Call or WhatsApp{' '}
                        <a className="text-white" href={`https://wa.me/${WA}`}>
                            <b>0718 819 413</b>
                        </a>
                    </span>
                </div>
            </div>

            {/* header */}
            <header className="sticky top-0 z-[5] border-b border-ps-line bg-ps-surface">
                <div
                    className={`${WRAP} flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5`}
                >
                    <a
                        href="#home"
                        aria-label="Pick&Send home"
                        className="flex items-center no-underline"
                    >
                        <Wordmark size="text-[1.55rem]" />
                    </a>
                    <nav
                        aria-label="Site"
                        onClick={() => setMenu(false)}
                        className={`${menu ? 'order-last mt-1 flex w-full flex-col border-t border-ps-line' : 'hidden'} md:order-none md:mt-0 md:flex md:w-auto md:flex-row md:flex-wrap md:gap-x-3.5 md:border-0`}
                    >
                        {NAV.map(([id, t]) => (
                            <a
                                key={id}
                                href={`#${id}`}
                                className="flex min-h-[46px] items-center border-b border-ps-line text-base font-semibold text-ps-ink no-underline last:border-b-0 hover:text-ps-accent md:min-h-11 md:border-0 md:text-[.84rem]"
                            >
                                {t}
                            </a>
                        ))}
                    </nav>
                    <div className="flex flex-nowrap gap-2">
                        <a
                            href="#merchants"
                            className={`${GHOST} !min-h-11 !px-3 !text-[.86rem] max-lg:hidden`}
                        >
                            Merchant log in
                        </a>
                        <a
                            href="#send"
                            className={`${PRIMARY} !min-h-11 !w-auto !px-3 !text-[.86rem]`}
                        >
                            Send with us
                        </a>
                        <button
                            type="button"
                            aria-expanded={menu}
                            aria-controls="site-nav"
                            onClick={() => setMenu(!menu)}
                            className="min-h-11 rounded-[10px] border-[1.5px] border-ps-line bg-ps-surface px-3 text-[.92rem] font-bold text-ps-brandink md:hidden"
                        >
                            <ListIcon />
                        </button>
                    </div>
                </div>
            </header>

            <main id="home">
                {/* ============ HERO ============ */}
                <section className="py-[26px_34px] md:py-[52px_56px]">
                    <div
                        className={`${WRAP} ${G400} items-center max-sm:gap-[26px]`}
                    >
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
                                Send a parcel from Nairobi to towns across
                                Kenya. For shops, online sellers and{' '}
                                <b className="text-ps-ink">
                                    anyone with something to send
                                </b>
                                .
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
                                href={wa(
                                    'Hi Pick&Send, I would like a quote for bulk items.',
                                )}
                            >
                                <span className="flex min-w-0 flex-col">
                                    <b className="text-[1.3rem] leading-tight font-extrabold max-sm:text-[1.1rem]">
                                        Sending bulk items? Get a quote.
                                    </b>
                                    <span className="text-[.95rem] font-semibold opacity-90">
                                        Call or WhatsApp 0718 819 413
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
                                <li>From documents to fridges</li>
                            </ul>
                        </div>

                        <div className="flex min-w-0 flex-col gap-3.5">
                            <div
                                className="flex min-w-0 flex-col gap-1 rounded-[18px] border border-ps-line bg-ps-surface p-4 sm:px-6 sm:py-[22px]"
                                aria-labelledby="board-h"
                            >
                                <h2
                                    id="board-h"
                                    className={`mb-2 text-[1.1rem] ${H3}`}
                                >
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
                                            key={k as string}
                                            style={
                                                {
                                                    '--rc': c,
                                                } as React.CSSProperties
                                            }
                                            className="relative flex flex-col gap-0.5 border-t border-ps-line py-3.5 pl-[34px] before:absolute before:inset-y-0 before:left-2 before:w-1 before:bg-[var(--rc)] after:absolute after:top-[19px] after:left-px after:h-[18px] after:w-[18px] after:rounded-full after:border-4 after:border-[var(--rc)] after:bg-ps-surface"
                                        >
                                            <b
                                                className={`text-[1.12rem] ${H3}`}
                                            >
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
                                <h2
                                    id="how-h"
                                    className={`mb-3 text-[1.1rem] ${H3}`}
                                >
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

                {/* ============ SEND A PARCEL ============ */}
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
                                        onChange={on('sname')}
                                        error={fErr.sname}
                                    />
                                    <Fld
                                        id="s-phone"
                                        label="Your phone number"
                                        type="tel"
                                        placeholder="07XX XXX XXX"
                                        autoComplete="tel"
                                        value={f.sphone}
                                        onChange={on('sphone')}
                                        error={fErr.sphone}
                                    />
                                    <Choice
                                        label="How do we get your parcel?"
                                        cols={1}
                                    >
                                        <Opt
                                            type="radio"
                                            name="hand"
                                            checked={f.hand === 'drop'}
                                            onChange={() => set('hand', 'drop')}
                                        >
                                            I will bring it to you
                                        </Opt>
                                        <Opt
                                            type="radio"
                                            name="hand"
                                            checked={f.hand === 'collect'}
                                            onChange={() =>
                                                set('hand', 'collect')
                                            }
                                        >
                                            Come and pick it up from my CBD
                                            shop, <b>free</b>
                                        </Opt>
                                    </Choice>
                                    <Fld
                                        select
                                        id="s-point"
                                        label="Where will you drop it?"
                                        hint="Bring it by 7pm."
                                        hidden={p.mode === 'collect'}
                                        value={f.point}
                                        onChange={on('point')}
                                        error={fErr.point}
                                    >
                                        <optgroup label="Nairobi CBD">
                                            <option value="cbd|Stanbank House, Moi Avenue, CBD">
                                                Stanbank House, Moi Avenue, CBD
                                                (free)
                                            </option>
                                        </optgroup>
                                        <optgroup label="Around Nairobi">
                                            {SATELLITES.map((t) => (
                                                <option
                                                    key={t}
                                                    value={`out|${t} agent`}
                                                >
                                                    {t} agent ({fmt(dropOffFee)}
                                                    )
                                                </option>
                                            ))}
                                        </optgroup>
                                    </Fld>
                                    <Fld
                                        id="s-addr"
                                        label="Where is your shop?"
                                        placeholder="Building, floor, shop number and street"
                                        hidden={p.mode !== 'collect'}
                                        hint="Have it ready for the rider, who waits up to 5 minutes."
                                        value={f.addr}
                                        onChange={on('addr')}
                                        error={fErr.addr}
                                    />
                                    <Fld
                                        id="s-count"
                                        label="How many parcels today?"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        hidden={!(p.mode === 'out' && p.share)}
                                        hint={`The ${fmt(dropOffFee)} agent drop-off fee is paid once for all parcels today.`}
                                        value={f.count}
                                        onChange={on('count')}
                                        error={fErr.count}
                                    />
                                    {p.mode === 'out' &&
                                        p.share &&
                                        p.n >= 2 && (
                                            <Opt
                                                type="checkbox"
                                                checked={f.same}
                                                onChange={(e: any) =>
                                                    set(
                                                        'same',
                                                        e.target.checked,
                                                    )
                                                }
                                            >
                                                I already paid this on another
                                                parcel today
                                            </Opt>
                                        )}
                                </Part>

                                <Part n="2" title="Recipient">
                                    <Fld
                                        id="r-name"
                                        label="Recipient's name"
                                        value={f.rname}
                                        onChange={on('rname')}
                                        error={fErr.rname}
                                    />
                                    <Fld
                                        id="r-phone"
                                        label="Recipient's phone number"
                                        type="tel"
                                        placeholder="07XX XXX XXX"
                                        hint="We text the collection code to this number."
                                        value={f.rphone}
                                        onChange={on('rphone')}
                                        error={fErr.rphone}
                                    />
                                    <Fld
                                        select
                                        id="r-town"
                                        label="Destination town"
                                        value={f.rtown}
                                        onChange={on('rtown')}
                                        error={fErr.rtown}
                                    >
                                        {townOptions}
                                    </Fld>
                                    <p className="rounded-[10px] bg-ps-soft px-3.5 py-3 text-[.92rem] font-semibold text-ps-softink">
                                        Collect at our pickup station in your
                                        nearest town, using the SMS code.
                                    </p>
                                </Part>

                                <Part n="3" title="Parcel">
                                    <Fld
                                        id="p-what"
                                        label="What is inside?"
                                        placeholder="e.g. clothes, phone, documents"
                                        value={f.what}
                                        onChange={on('what')}
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
                                        onChange={on('worth')}
                                        error={fErr.worth}
                                    />
                                    <Choice label="What kind of parcel?">
                                        <Opt
                                            type="radio"
                                            name="kind"
                                            checked={f.kind === 'g'}
                                            onChange={() => set('kind', 'g')}
                                        >
                                            General
                                        </Opt>
                                        <Opt
                                            type="radio"
                                            name="kind"
                                            checked={f.kind === 'e'}
                                            onChange={() => set('kind', 'e')}
                                        >
                                            Electronics
                                        </Opt>
                                    </Choice>
                                    <Fld
                                        select
                                        id="p-size"
                                        label="Weight"
                                        hidden={f.kind === 'e'}
                                        value={f.size}
                                        onChange={on('size')}
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
                                        hidden={
                                            f.kind === 'e' || f.size !== 'kg'
                                        }
                                        hint={`KSh ${BASE10} for the first 10 kg, then KSh ${PER_KG} for every extra kg. Up to ${MAX_KG} kg.`}
                                        value={f.kg}
                                        onChange={on('kg')}
                                        error={fErr.kg}
                                    />
                                    <Fld
                                        select
                                        id="p-item"
                                        label="Which item?"
                                        hint="Priced per item, with fragile handling included."
                                        hidden={f.kind !== 'e'}
                                        value={f.item}
                                        onChange={on('item')}
                                        error={fErr.item}
                                    >
                                        {ELEC.map((g) => (
                                            <optgroup
                                                key={g.group}
                                                label={g.group}
                                            >
                                                {g.items.map((it) => (
                                                    <option
                                                        key={it.id}
                                                        value={it.id}
                                                    >
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
                                                onChange={() =>
                                                    set('pack', false)
                                                }
                                            >
                                                No, it is packed and ready
                                            </Opt>
                                            <Opt
                                                type="radio"
                                                name="pack"
                                                checked={f.pack}
                                                onChange={() =>
                                                    set('pack', true)
                                                }
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
                                        onChange={on('paynum')}
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
                                        onChange={on('cod')}
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
                                    <p className="text-[.94rem]">
                                        {breakdown(p)}
                                    </p>
                                    <p className="text-[.94rem]">
                                        {codNote(cod)}
                                    </p>
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
                                        <span className="rounded-[5px] bg-ps-onwa px-2 py-[3px] text-[.75rem] font-extrabold tracking-[.04em] whitespace-nowrap text-ps-wa">
                                            M-PESA
                                        </span>
                                        {sending
                                            ? 'SENDING…'
                                            : p.total > 0
                                              ? 'PAY NOW'
                                              : 'BOOK NOW'}
                                    </button>
                                    {b && (
                                        <a
                                            className={`${BTN} !min-h-12 border-ps-wa bg-ps-surface !text-base text-ps-wa max-sm:!px-2 max-sm:!text-[.92rem]`}
                                            target="_blank"
                                            rel="noopener"
                                            href={b.receiptHref}
                                        >
                                            Share receipt on WhatsApp
                                        </a>
                                    )}
                                </div>
                            </div>

                            {flash?.error && (
                                <p className={ERR} role="alert">
                                    {flash.error}
                                </p>
                            )}

                            {/* server flash: booking created */}
                            {b && (
                                <div
                                    id="send-out"
                                    className="flex flex-col gap-3 rounded-2xl border-2 border-ps-wa bg-ps-surface p-4 sm:px-[22px] sm:py-5"
                                >
                                    <div className="flex flex-col gap-2.5 rounded-[14px] bg-ps-band px-[18px] py-4 text-ps-bandmuted">
                                        <span
                                            className={EYEBROW.replace(
                                                'text-ps-accent',
                                                'text-ps-key',
                                            )}
                                        >
                                            {b.who[0]}
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
                                                    {b.who[1]}
                                                </b>
                                                <span>{b.who[2]}</span>
                                            </div>
                                            <div className="flex flex-col items-end rounded-[10px] border-[1.5px] border-dashed border-ps-key px-3.5 py-1.5">
                                                <span className="text-[.75rem] font-bold tracking-[.08em] uppercase">
                                                    Handover code
                                                </span>
                                                <b className="font-mono text-[1.7rem] tracking-[.18em] text-white">
                                                    {b.handover_code}
                                                </b>
                                            </div>
                                        </div>
                                        <p className="text-white">{b.who[3]}</p>
                                    </div>

                                    <div className="flex min-w-0 flex-col gap-3.5">
                                        <h3 className={`text-[1.3rem] ${H3}`}>
                                            Pay <span>{fmt(b.total)}</span> by
                                            M-PESA
                                        </h3>
                                        <ol className="m-0 flex flex-col gap-1.5 pl-[22px]">
                                            <li>
                                                Open M-PESA, choose{' '}
                                                <b>Lipa na M-PESA</b>, then{' '}
                                                <b>Buy Goods and Services</b>.
                                            </li>
                                            <li>
                                                Enter Till number{' '}
                                                <b className="font-mono">
                                                    [TILL NO.]
                                                </b>
                                                .
                                            </li>
                                            <li>
                                                Enter <b>{fmt(b.total)}</b> and
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
                                                        'code',
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
                                                    ? 'Confirming…'
                                                    : 'Confirm payment'}
                                            </button>
                                        </form>
                                        {flash?.payment_confirmed && (
                                            <p className="rounded-[10px] bg-ps-soft px-3.5 py-3 text-[.92rem] font-semibold text-ps-softink">
                                                Payment confirmed. The parcel
                                                will leave Nairobi once it is
                                                scanned in.
                                            </p>
                                        )}
                                    </div>

                                    {b.custHref && (
                                        <div className="flex flex-wrap gap-3">
                                            <a
                                                className={GHOST}
                                                href={b.custHref}
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
                                            <b
                                                id="rcpt-h"
                                                className="text-ps-brandink"
                                            >
                                                Receipt
                                            </b>
                                            <span
                                                className={
                                                    b.paid
                                                        ? PILLS.done
                                                        : PILLS.wait
                                                }
                                            >
                                                {b.paid
                                                    ? 'Paid'
                                                    : 'Awaiting payment code'}
                                            </span>
                                        </div>
                                        <dl className="m-0 grid grid-cols-1 gap-x-4 gap-y-1.5 text-[.95rem] sm:grid-cols-[minmax(90px,auto)_1fr]">
                                            {b.rows.map(([k, v]) => (
                                                <div
                                                    key={k}
                                                    className="contents"
                                                >
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
                                            href={b.receiptHref}
                                            target="_blank"
                                            rel="noopener"
                                        >
                                            Share receipt on WhatsApp
                                        </a>
                                        <a
                                            className={GHOST}
                                            href={b.bookingHref}
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
                                        Share the receipt with the recipient.
                                        Send the booking to us on 0718 819 413
                                        and we reply with your tracking number.
                                    </span>
                                </div>
                            )}
                        </form>
                    </div>
                </Block>

                {/* ============ SUPPLIES ============ */}
                <Block id="supplies" tone="band">
                    <div className={`${WRAP} ${G400} items-start`}>
                        <div>
                            <SectionHead
                                dark
                                className="mb-6"
                                eyebrow="Live outside Nairobi?"
                                title="Get your Nairobi supplies through Pick&Send"
                                text="Stock for your shop, spare parts, a phone you bought online. Tell us where to pick it and we bring it to your town, once or on a schedule."
                            />
                            <ul className={CHECKS_BAND}>
                                <li>
                                    <b>
                                        We pick from shops in the Nairobi CBD.
                                    </b>{' '}
                                    One collection fee covers everything from
                                    that supplier.
                                </li>
                                <li>
                                    <b>Daily, weekly or monthly.</b> Set it once
                                    and your supplies keep coming.
                                </li>
                                <li>
                                    <b>You pay the normal picked-up price</b> by
                                    M-PESA and collect with your SMS code.
                                </li>
                            </ul>
                        </div>
                        <form
                            className={CARD}
                            noValidate
                            onSubmit={submitSupplies}
                        >
                            <h3 className={`text-[1.25rem] ${H3}`}>
                                Ask us to pick for you
                            </h3>
                            <Fld
                                id="u-name"
                                label="Your name"
                                autoComplete="name"
                                value={s.name}
                                onChange={(e: any) =>
                                    setS('name', e.target.value)
                                }
                                error={sErr.name}
                            />
                            <Fld
                                id="u-phone"
                                label="Your phone number"
                                type="tel"
                                placeholder="07XX XXX XXX"
                                autoComplete="tel"
                                value={s.phone}
                                onChange={(e: any) =>
                                    setS('phone', e.target.value)
                                }
                                error={sErr.phone}
                            />
                            <Fld
                                select
                                id="u-town"
                                label="Your town"
                                value={s.town}
                                onChange={(e: any) =>
                                    setS('town', e.target.value)
                                }
                                error={sErr.town}
                            >
                                {townOptions}
                            </Fld>
                            <Fld
                                id="u-what"
                                label="What should we pick?"
                                placeholder="e.g. 2 cartons of cosmetics"
                                value={s.what}
                                onChange={(e: any) =>
                                    setS('what', e.target.value)
                                }
                                error={sErr.what}
                            />
                            <Fld
                                id="u-from"
                                label="Where do we pick it?"
                                placeholder="Shop or supplier name, building and street"
                                value={s.from}
                                onChange={(e: any) =>
                                    setS('from', e.target.value)
                                }
                                error={sErr.from}
                            />
                            <Fld
                                id="u-sphone"
                                label="Supplier's phone number"
                                type="tel"
                                placeholder="Optional"
                                value={s.sphone}
                                onChange={(e: any) =>
                                    setS('sphone', e.target.value)
                                }
                                error={sErr.sphone}
                            />
                            <Choice label="How often?" cols={4}>
                                {['Once', 'Daily', 'Weekly', 'Monthly'].map(
                                    (o) => (
                                        <Opt
                                            key={o}
                                            type="radio"
                                            name="often"
                                            checked={s.often === o}
                                            onChange={() => setS('often', o)}
                                        >
                                            {o}
                                        </Opt>
                                    ),
                                )}
                            </Choice>
                            <button
                                className={PRIMARY}
                                type="submit"
                                disabled={sSending}
                            >
                                {sSending ? 'Sending…' : 'Request my pickup'}
                            </button>

                            {supply && (
                                <div className="flex flex-col gap-3 rounded-2xl border-2 border-ps-wa bg-ps-surface p-4 sm:px-[22px] sm:py-5">
                                    <b>
                                        Send this to us on WhatsApp: 0718 819
                                        413
                                    </b>
                                    <pre className="m-0 rounded-[10px] bg-ps-surface2 p-3.5 font-sans text-[.96rem] whitespace-pre-wrap select-all">
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
                                        We confirm the price and the pickup
                                        time.
                                    </span>
                                </div>
                            )}
                        </form>
                    </div>
                </Block>

                {/* ============ MERCHANTS ============ */}
                <Block id="merchants" tone="tint">
                    <div className={WRAP}>
                        <SectionHead
                            eyebrow="Merchants"
                            title="Your orders and your money in one place"
                            text="Sell with Cash on Delivery to customers across Kenya. Log in to see every order and your wallet."
                        />
                        {!merchantUser ? (
                            <div className={`${G400} items-start`}>
                                <ul className={CHECKS}>
                                    <li>
                                        <b>
                                            Your customer pays our M-PESA Till,
                                        </b>{' '}
                                        never the agent and never in cash.
                                    </li>
                                    <li>
                                        <b>Released only when</b> the code
                                        matches and the payment is confirmed.
                                    </li>
                                    <li>
                                        <b>Money in your wallet instantly,</b>{' '}
                                        less 1.6%. Withdraw to M-PESA any time.
                                    </li>
                                    <li>
                                        <b>Free pickup from your CBD shop,</b>{' '}
                                        however many parcels you send.
                                    </li>
                                    <li>
                                        <b>Not collected in 7 days?</b> The
                                        parcel comes back to you. A return fee
                                        applies.
                                    </li>
                                </ul>
                                <form
                                    className={CARD}
                                    onSubmit={
                                        requestingOtp ? verifyOtp : requestOtp
                                    }
                                >
                                    <h3 className={`text-[1.25rem] ${H3}`}>
                                        Merchant log in
                                    </h3>
                                    <Fld
                                        id="m-phone"
                                        label="M-PESA phone number"
                                        type="tel"
                                        placeholder="07XX XXX XXX"
                                        autoComplete="tel"
                                        value={otpForm.data.phone}
                                        onChange={(e: any) =>
                                            otpForm.setData(
                                                'phone',
                                                e.target.value,
                                            )
                                        }
                                        error={otpForm.errors.phone}
                                    />
                                    {requestingOtp && (
                                        <Fld
                                            id="m-code"
                                            label="6-digit code we sent you"
                                            inputMode="numeric"
                                            value={otpForm.data.code}
                                            onChange={(e: any) =>
                                                otpForm.setData(
                                                    'code',
                                                    e.target.value,
                                                )
                                            }
                                            error={otpForm.errors.code}
                                        />
                                    )}
                                    <button
                                        className={PRIMARY}
                                        type="submit"
                                        disabled={otpForm.processing}
                                    >
                                        {otpForm.processing
                                            ? 'Sending…'
                                            : requestingOtp
                                              ? 'Verify and log in'
                                              : 'Send code'}
                                    </button>
                                    <span className={HINT}>
                                        We text you a code each time. No
                                        password to remember.
                                    </span>
                                </form>
                            </div>
                        ) : (
                            <div className="rounded-[18px] border border-ps-line bg-ps-surface p-4 sm:p-6">
                                <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <span className={EYEBROW}>
                                            Signed in
                                        </span>
                                        <h3 className={`text-[1.3rem] ${H3}`}>
                                            {merchantUser.business_name ??
                                                merchantUser.name}
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        className={`${GHOST} max-sm:!w-auto`}
                                        onClick={logout}
                                    >
                                        Log out
                                    </button>
                                </div>
                                <div className={G230}>
                                    {(
                                        [
                                            [
                                                'Wallet, ready to withdraw',
                                                fmt(merchant?.wallet ?? 0),
                                                null,
                                                true,
                                            ],
                                            [
                                                'Waiting for customers to collect',
                                                fmt(merchant?.waiting ?? 0),
                                                null,
                                                false,
                                            ],
                                            [
                                                'Withdrawn this month',
                                                fmt(
                                                    merchant?.withdrawn_month ??
                                                        0,
                                                ),
                                                null,
                                                false,
                                            ],
                                            [
                                                'Pick&Send points',
                                                String(merchant?.points ?? 0),
                                                'Worth KSh 1 off each on delivery',
                                                false,
                                            ],
                                        ] as [
                                            string,
                                            string,
                                            string | null,
                                            boolean,
                                        ][]
                                    ).map(([label, v, sub, main]) => (
                                        <div
                                            key={label}
                                            className={`flex min-w-0 flex-col gap-1.5 rounded-[14px] border p-[18px] ${main ? 'border-transparent bg-ps-soft' : 'border-ps-line'}`}
                                        >
                                            <span
                                                className={`text-[.9rem] font-semibold ${main ? 'text-ps-softink' : 'text-ps-muted'}`}
                                            >
                                                {label}
                                            </span>
                                            <b className="text-[1.7rem] leading-tight font-extrabold text-ps-brandink tabular-nums">
                                                {v}
                                            </b>
                                            {sub && (
                                                <span className={HINT}>
                                                    {sub}
                                                </span>
                                            )}
                                            {main && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className={`${PAY} self-start`}
                                                        onClick={withdraw}
                                                        disabled={
                                                            (merchant?.wallet ??
                                                                0) <= 0
                                                        }
                                                    >
                                                        <span className="rounded-[5px] bg-ps-onwa px-2 py-[3px] text-[.75rem] font-extrabold tracking-[.04em] whitespace-nowrap text-ps-wa">
                                                            M-PESA
                                                        </span>
                                                        Withdraw
                                                    </button>
                                                    {flash?.withdrawn && (
                                                        <span
                                                            className={HINT}
                                                            role="status"
                                                        >
                                                            Withdrawal sent to
                                                            your M-PESA.
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <h3
                                    className={`mt-[22px] mb-2.5 text-[1.3rem] ${H3}`}
                                >
                                    Orders
                                </h3>
                                <div className="overflow-x-auto rounded-[14px] border border-ps-line bg-ps-surface">
                                    <Table
                                        head={[
                                            'Tracking no.',
                                            'Recipient',
                                            'Town',
                                            'Status',
                                            'COD',
                                        ]}
                                        rows={(merchant?.orders ?? []).map(
                                            (o) => (
                                                <tr
                                                    key={o.tracking_no}
                                                    className="group"
                                                >
                                                    <td
                                                        className={`${TD} font-mono`}
                                                    >
                                                        {o.tracking_no}
                                                    </td>
                                                    <td className={TD}>
                                                        {o.recipient_name}
                                                    </td>
                                                    <td className={TD}>
                                                        {o.town}
                                                    </td>
                                                    <td className={TD}>
                                                        <span
                                                            className={
                                                                PILLS[
                                                                    o.status ===
                                                                    'at_pickup'
                                                                        ? 'wait'
                                                                        : o.status ===
                                                                            'in_transit'
                                                                          ? 'move'
                                                                          : 'done'
                                                                ]
                                                            }
                                                        >
                                                            {o.status}
                                                        </span>
                                                    </td>
                                                    <td
                                                        className={`${TD} text-right`}
                                                    >
                                                        {fmt(o.cod_amount)}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </Block>

                {/* ============ PRICING ============ */}
                <Block id="pricing">
                    <div className={WRAP}>
                        <SectionHead
                            eyebrow="Pricing"
                            title="From KSh 199, one price to every town"
                            text="The same price to Mombasa, Meru, Eldoret or Kisumu."
                        >
                            <div className="mb-2 grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-3">
                                {[
                                    ['Bring it to our CBD point', 'Free'],
                                    ['We pick up from your CBD shop', 'Free'],
                                    [
                                        'Bring it to our agent in a Nairobi satellite town',
                                        `From ${fmt(dropOffFee)}, at ${SATELLITES.join(', ')}`,
                                    ],
                                ].map(([t, d]) => (
                                    <div
                                        key={t}
                                        className="flex flex-col gap-0.5 rounded-xl border border-ps-line bg-ps-surface px-4 py-3.5"
                                    >
                                        <b className="text-ps-brandink">{t}</b>
                                        <span className="text-[.9rem] text-ps-muted">
                                            {d}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </SectionHead>
                        <h3 className={`mt-[26px] mb-2.5 text-[1.15rem] ${H3}`}>
                            General parcels
                        </h3>
                        <div className="overflow-x-auto rounded-[14px] border border-ps-line bg-ps-surface">
                            <Table
                                head={['Weight', 'Delivery price (KSh)']}
                                rows={GENERAL.map((x) => (
                                    <tr
                                        key={x.id}
                                        className={`group ${x.perKg ? 'bg-ps-soft text-ps-softink' : ''}`}
                                    >
                                        <td className={`${TD} font-semibold`}>
                                            {x.label}
                                        </td>
                                        <td className={`${TD} text-right`}>
                                            {x.perKg
                                                ? `${num(BASE10)} + ${PER_KG} per extra kg`
                                                : num(x.p)}
                                        </td>
                                    </tr>
                                ))}
                            />
                        </div>
                        <p className="mt-2.5 text-[.92rem] text-ps-muted">
                            {`Example: 15 kg is ${fmt(kgPrice(15))}. Parcels above 10 kg and big appliances carry their own collection fee. Over ${MAX_KG} kg, ask us for a quote.`}
                        </p>
                        <h3 className={`mt-[26px] mb-2.5 text-[1.15rem] ${H3}`}>
                            Electronics and appliances
                        </h3>
                        <p className="mb-2.5 text-[.92rem] text-ps-muted">
                            Tap a group to see its prices. CBD pickup is free
                            for anything a rider can carry.
                        </p>
                        <div className="flex max-w-[46rem] flex-col gap-2.5">
                            {ELEC.map((g) => (
                                <details
                                    key={g.group}
                                    className="rounded-xl border border-ps-line bg-ps-surface px-[18px]"
                                >
                                    <summary className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 font-bold">
                                        {g.group.replace(', by weight', '')}
                                        <span className="font-semibold whitespace-nowrap text-ps-muted">
                                            {`from ${fmt(Math.min(...g.items.map((i) => i.p)))}`}
                                        </span>
                                    </summary>
                                    <div className="mb-2.5 [&_td]:!px-2 [&_td]:!py-2.5 [&_td:first-child]:!pl-0 [&_td:last-child]:!pr-0 [&_th]:!px-2 [&_th]:!py-2.5 [&_th:first-child]:!pl-0 [&_th:last-child]:!pr-0">
                                        <Table
                                            small
                                            head={[
                                                'Item',
                                                'Delivery',
                                                'CBD pickup',
                                            ]}
                                            rows={g.items.map((it) => (
                                                <tr
                                                    key={it.id}
                                                    className="group"
                                                >
                                                    <td className={TD}>
                                                        {it.label}
                                                    </td>
                                                    <td
                                                        className={`${TD} text-right`}
                                                    >
                                                        {num(it.p)}
                                                    </td>
                                                    <td
                                                        className={`${TD} text-right`}
                                                    >
                                                        {it.pu <= 100
                                                            ? 'Free'
                                                            : num(it.pu + 50)}
                                                    </td>
                                                </tr>
                                            ))}
                                        />
                                    </div>
                                </details>
                            ))}
                        </div>
                        <a className={`${PRIMARY} mt-[18px]`} href="#send">
                            Get my exact price
                        </a>
                        <ul className={`${FACTS} mt-4`}>
                            <li>Packaging only if you ask, from KSh 30</li>
                            <li>Cash on Delivery: 1.6% of what we collect</li>
                            <li>
                                <b className="text-ps-ink">
                                    Bulk items: get a quote, call or WhatsApp
                                    0718 819 413
                                </b>
                            </li>
                        </ul>
                        <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-center gap-[18px] rounded-2xl bg-ps-soft p-4 text-ps-softink sm:px-6 sm:py-[22px]">
                            <div>
                                <span className={EYEBROW}>
                                    Pick&amp;Send points
                                </span>
                                <h3 className="mt-1 text-[1.35rem] font-extrabold text-ps-brandink">
                                    Every parcel earns you points
                                </h3>
                            </div>
                            <ul className="m-0 flex flex-col gap-1.5 pl-5">
                                <li>
                                    <b>Earn 2 points</b> for every KSh 100 you
                                    spend on delivery.
                                </li>
                                <li>
                                    <b>1 point is KSh 1 off</b> your next
                                    parcel.
                                </li>
                                <li>
                                    <b>Use them from 100 points.</b> They are
                                    saved under your phone number.
                                </li>
                            </ul>
                        </div>
                    </div>
                </Block>

                {/* ============ TRACK ============ */}
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
                                {tLoading ? 'Searching…' : 'Track'}
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
                                                    i ===
                                                    tracking.events.length - 1
                                                        ? 'now'
                                                        : ''
                                                ]
                                            }
                                        >
                                            <b className="block">{e.label}</b>
                                            <span className="text-[.9rem] text-ps-muted">
                                                {e.description} ·{' '}
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

                {/* ============ COMMUNITY ============ */}
                <Block id="community" tone="band">
                    <div className={`${WRAP} ${G400} items-start`}>
                        <div>
                            <SectionHead
                                dark
                                className="mb-3.5"
                                eyebrow="Community"
                                title="Join the movement on WhatsApp"
                                text="Book a parcel without leaving WhatsApp, and hear our news first. It is free to join and you can leave any time."
                            />
                            <ul className={CHECKS_BAND}>
                                <li>
                                    <b>The group is for booking.</b> Drop your
                                    parcel sending request there and we book it
                                    for you.
                                </li>
                                <li>
                                    <b>The channel is for updates:</b> new
                                    towns, pickup stations, offers and any
                                    delays.
                                </li>
                                <li>
                                    <b>Prefer a private chat?</b> Message us
                                    directly and we book it the same way.
                                </li>
                            </ul>
                        </div>
                        <div className={CARD}>
                            <h3 className={`text-[1.25rem] ${H3}`}>
                                Pick how you want to join
                            </h3>
                            <a
                                className={PAY}
                                target="_blank"
                                rel="noopener"
                                href={wa(
                                    'Hi Pick&Send, please add me to your WhatsApp group. I want to join the movement.',
                                )}
                            >
                                Join the group
                            </a>
                            <a
                                className={GHOST}
                                target="_blank"
                                rel="noopener"
                                href={wa(
                                    'Hi Pick&Send, please send me the link to your WhatsApp channel for updates.',
                                )}
                            >
                                Follow the channel for updates
                            </a>
                            <a
                                className={GHOST}
                                target="_blank"
                                rel="noopener"
                                href={wa(
                                    'Hi Pick&Send, please book a parcel for me.\n\nFrom (name and phone):\nPickup or drop-off:\nTo (name and phone):\nDestination town:\nWhat is inside and weight:\nEstimated worth:\nM-PESA number paying:',
                                )}
                            >
                                Book a parcel on WhatsApp
                            </a>
                            <span className={HINT}>
                                Call or WhatsApp 0718 819 413. We never ask for
                                your M-PESA PIN.
                            </span>
                        </div>
                    </div>
                </Block>

                {/* ============ FAQ ============ */}
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
            </main>

            <footer className="bg-ps-band pt-11 pb-7 text-[.94rem] text-ps-bandmuted [&_a]:text-white [&_b]:mb-1 [&_b]:block [&_b]:text-white">
                <div className={WRAP}>
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(210px,100%),1fr))] gap-[26px]">
                        <div>
                            <Wordmark onBand size="text-[1.4rem]" />
                            <br />
                            Parcels from Nairobi to towns across Kenya.
                        </div>
                        <div>
                            <b>Visit us</b>Stanbank House, Moi Avenue, Nairobi
                            CBD
                            <br />
                            P.O. Box 25079-00100 GPO Nairobi
                        </div>
                        <div>
                            <b>Talk to us</b>Call or WhatsApp{' '}
                            <a href={`https://wa.me/${WA}`}>0718 819 413</a>
                            <br />
                            <a href="#community">Join our WhatsApp community</a>
                            <br />
                            Nairobi CBD: open 7am to 8pm
                        </div>
                        <div>
                            <b>Pay</b>M-PESA Till [TILL NO.]
                            <br />
                            M-PESA only. No cash, no cards.
                        </div>
                    </div>
                    <div className="mt-[26px] border-t border-ps-bandline pt-4 text-[.84rem]">
                        Neerabup Logistics Ltd trading as Pick&amp;Send ·
                        Communications Authority of Kenya licence [LICENCE NO.]
                    </div>
                </div>
            </footer>

            {/* floating WhatsApp */}
            <a
                href={wa('Hi Pick&Send')}
                target="_blank"
                rel="noopener"
                aria-label="Chat with us on WhatsApp"
                className={`fixed right-3.5 bottom-3.5 z-[6] flex h-10 items-center gap-1.5 rounded-full bg-ps-wa pr-[13px] pl-[11px] text-[.84rem] font-bold text-ps-onwa no-underline shadow-[0_3px_10px_rgba(0,0,0,.22)] transition motion-reduce:transition-none max-sm:h-[42px] max-sm:w-[42px] max-sm:justify-center max-sm:p-0 ${typing ? 'pointer-events-none translate-y-3 opacity-0' : 'opacity-90'}`}
            >
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-[18px] w-[18px] flex-none fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
                >
                    <path d="M4 19.5 5.3 15A8 8 0 1 1 9 18.7z" />
                </svg>
                <span className="max-sm:hidden">Chat</span>
            </a>
        </div>
    );
}
