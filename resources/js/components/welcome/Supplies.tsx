// src/components/pickandsend/Supplies.tsx
import { useForm } from '@inertiajs/react';
import type { Config } from '@/types/config';
import { Block } from './Block';
import { SectionHead } from './SectionHead';
import { Choice, Fld, Opt } from './FormBits';
import {
    CARD,
    CHECKS_BAND,
    G400,
    H3,
    HINT,
    PAY,
    PRIMARY,
    WRAP,
} from './shared';
import type { FlashSupply } from './shared';

export function Supplies({
    config,
    supply,
}: {
    config: Config;
    supply: FlashSupply | null;
}) {
    const { towns: TOWNS, routes: ROUTES } = config;

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
                            <b>We pick from shops in the Nairobi CBD.</b> One
                            collection fee covers everything from that supplier.
                        </li>
                        <li>
                            <b>Daily, weekly or monthly.</b> Set it once and
                            your supplies keep coming.
                        </li>
                        <li>
                            <b>You pay the normal picked-up price</b> by M-PESA
                            and collect with your SMS code.
                        </li>
                    </ul>
                </div>
                <form className={CARD} noValidate onSubmit={submitSupplies}>
                    <h3 className={`text-[1.25rem] ${H3}`}>
                        Ask us to pick for you
                    </h3>
                    <Fld
                        id="u-name"
                        label="Your name"
                        autoComplete="name"
                        value={s.name}
                        onChange={(e: any) => setS('name', e.target.value)}
                        error={sErr.name}
                    />
                    <Fld
                        id="u-phone"
                        label="Your phone number"
                        type="tel"
                        placeholder="07XX XXX XXX"
                        autoComplete="tel"
                        value={s.phone}
                        onChange={(e: any) => setS('phone', e.target.value)}
                        error={sErr.phone}
                    />
                    <Fld
                        select
                        id="u-town"
                        label="Your town"
                        value={s.town}
                        onChange={(e: any) => setS('town', e.target.value)}
                        error={sErr.town}
                    >
                        {townOptions}
                    </Fld>
                    <Fld
                        id="u-what"
                        label="What should we pick?"
                        placeholder="e.g. 2 cartons of cosmetics"
                        value={s.what}
                        onChange={(e: any) => setS('what', e.target.value)}
                        error={sErr.what}
                    />
                    <Fld
                        id="u-from"
                        label="Where do we pick it?"
                        placeholder="Shop or supplier name, building and street"
                        value={s.from}
                        onChange={(e: any) => setS('from', e.target.value)}
                        error={sErr.from}
                    />
                    <Fld
                        id="u-sphone"
                        label="Supplier's phone number"
                        type="tel"
                        placeholder="Optional"
                        value={s.sphone}
                        onChange={(e: any) => setS('sphone', e.target.value)}
                        error={sErr.sphone}
                    />
                    <Choice label="How often?" cols={4}>
                        {['Once', 'Daily', 'Weekly', 'Monthly'].map((o) => (
                            <Opt
                                key={o}
                                type="radio"
                                name="often"
                                checked={s.often === o}
                                onChange={() => setS('often', o)}
                            >
                                {o}
                            </Opt>
                        ))}
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
                            <b>Send this to us on WhatsApp: 0718 819 413</b>
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
                                We confirm the price and the pickup time.
                            </span>
                        </div>
                    )}
                </form>
            </div>
        </Block>
    );
}
