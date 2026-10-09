// resources/js/lib/pricing.ts
import type { Config } from '@/types/config';

export const num = (n: number) => Math.round(n).toLocaleString('en-KE');
export const fmt = (n: number) => 'KSh ' + num(n);
export const toNum = (v: unknown) =>
    Number(String(v).replace(/[^0-9.]/g, '')) || 0;

const kgValue = (v: unknown) => Math.ceil(toNum(v));

export function makePricing(cfg: Config) {
    /* ---------------- constants ---------------- */
    const C = cfg.constants;

    /* ---------------- lookup maps ---------------- */
    const ITEMS: Record<string, Config['elec'][number]['items'][number]> = {};
    cfg.elec.forEach((g) => g.items.forEach((it) => (ITEMS[it.id] = it)));

    const GEN: Record<string, Config['general'][number]> = {};
    cfg.general.forEach((g) => (GEN[g.id] = g));

    /* ---------------- helpers ---------------- */
    const kgPrice = (kg: number) => C.base10 + C.perKg * (kg - 10);

    // per-kg pickup fee (unchanged from your original)
    const kgPu = (kg: number) => (kg <= 20 ? 150 : kg <= 30 ? 200 : 250);

    const pickTown = (v: string) => {
        const [r, t] = v.split('|');
        return { route: cfg.routes[r] ?? r, town: t ?? '' };
    };

    const handoverMode = (f: any) => {
        if (f.hand === 'collect') return 'collect';
        if ((f.point ?? '').startsWith('out|')) return 'out';
        return 'drop';
    };

    /* ---------------- price ---------------- */
    function price(f: any) {
        const elec = f.kind === 'e';
        let it: any;

        if (elec) {
            it = ITEMS[f.item];
            if (!it) {
                return {
                    n: 1,
                    point: '',
                    free5: false,
                    mode: 'drop',
                    fee: 0,
                    base: 0,
                    pack: 0,
                    coll: 0,
                    share: false,
                    total: 0,
                    elec: true,
                    item: { label: '', p: 0, pack: 0, pu: 0 },
                    points: 0,
                };
            }
        } else {
            const b = GEN[f.size];
            if (b?.perKg) {
                const kg = Math.min(C.maxKg, Math.max(11, kgValue(f.kg)));
                it = {
                    label: kg + ' kg',
                    p: kgPrice(kg),
                    pack: b.pack,
                    pu: kgPu(kg),
                };
            } else {
                it = b ?? { label: '', p: 0, pack: 0, pu: 0 };
            }
        }

        const pack = f.pack ? it.pack : 0;
        const [, point] = (f.point ?? '').split('|');
        const mode = handoverMode(f);

        // "share" = the fee is ≤ 100, so it can be bundled across parcels
        const share = it.pu <= 100;

        // base pickup/drop-off fee for this parcel
        const fee =
            mode === 'collect'
                ? share
                    ? 0
                    : it.pu + 50
                : mode === 'out'
                  ? it.pu + 50
                  : 0;

        const n = Math.max(
            1,
            parseInt(String(f.count ?? 1).replace(/[^0-9]/g, ''), 10) || 1,
        );
        const free5 = mode === 'collect' && share;

        // if paid already today, don't charge again
        const coll =
            free5 || (mode !== 'drop' && share && n > 1 && f.same) ? 0 : fee;

        const total = it.p + pack + coll;

        return {
            n,
            point,
            free5,
            mode,
            fee,
            base: it.p,
            pack,
            coll,
            share,
            total,
            elec,
            item: it,
            points: Math.floor(total * C.pointsRate), // ← uses pointsRate
        };
    }

    /* ---------------- breakdown ---------------- */
    function breakdown(p: ReturnType<typeof price>) {
        const m = p.mode;
        return (
            `${p.item.label} delivery ${fmt(p.base)}` +
            (m === 'drop'
                ? ', drop-off free'
                : p.coll
                  ? ' + ' +
                    (m === 'collect' ? 'pickup ' : 'agent drop-off ') +
                    fmt(p.coll)
                  : p.free5
                    ? ', CBD pickup free'
                    : ', already paid today') +
            (p.pack ? ' + packaging ' + fmt(p.pack) : '') +
            '.'
        );
    }

    /* ---------------- cod note ---------------- */
    function codNote(cod: number) {
        if (cod <= 0) return '';
        const cut = Math.round(cod * C.codFeeRate); // ← uses codFeeRate
        return `Recipient pays ${fmt(cod)} by M-PESA. Our ${(C.codFeeRate * 100).toFixed(1)}% fee is ${fmt(cut)}, so you receive ${fmt(cod - cut)}.`;
    }

    /* ---------------- phone normaliser ---------------- */
    const norm = (x: unknown) => {
        const s = String(x).replace(/[^0-9]/g, '');
        return s.charAt(0) === '0' ? '254' + s.slice(1) : s;
    };

    /* ---------------- build booking ---------------- */
    function buildBooking(
        f: any,
        p: ReturnType<typeof price>,
        pickCode: string,
    ) {
        const d = pickTown(f.rtown);
        const cod = toNum(f.cod);
        const code = f.code.trim().toUpperCase();
        const hand =
            p.mode === 'collect'
                ? `Picked up from ${f.addr.trim()} (CBD)`
                : `Brought to ${p.point}`;

        const rows: [string, string][] = [
            ['From', `${f.sname.trim()}, ${f.sphone.trim()}`],
            ['Handover', hand],
            ['Delivery', fmt(p.base)],
            [
                p.mode === 'out' ? 'Agent drop-off fee' : 'Pickup',
                p.mode === 'drop'
                    ? 'None, brought to our CBD point'
                    : p.coll
                      ? fmt(p.coll)
                      : p.free5
                        ? 'Free, CBD shop pickup'
                        : 'Already paid today',
            ],
            ['To', `${f.rname.trim()}, ${f.rphone.trim()}`],
            ['Collect at', 'Pick&Send pickup station, ' + d.town],
            ['Parcel', `${f.what.trim()} (${p.item.label})`],
            ['Estimated worth', fmt(toNum(f.worth))],
            [
                'Packaging',
                p.pack ? 'Packed by Pick&Send, ' + fmt(p.pack) : 'Not needed',
            ],
            [
                'Cash on Delivery',
                cod > 0 ? fmt(cod) + ' to pay at collection' : 'None',
            ],
            ['Total', fmt(p.total)],
            [
                'Hand over to',
                (p.mode === 'collect'
                    ? 'Rider Kevin M., staff ID PS-R014'
                    : 'Agent Mary W., agent ID PS-A007') +
                    `, handover code ${pickCode} (example)`,
            ],
            ['M-PESA number paying', f.paynum.trim() || 'Not entered yet'],
            ['M-PESA code', code || 'Not entered yet'],
            ['Points earned', String(p.points)],
        ];

        const lines = rows.map((r) => r[0] + ': ' + r[1]).join('\n');

        const receipt =
            'PICK&SEND RECEIPT\n' +
            lines +
            '\n\nThe recipient gets an SMS code when the parcel is ready to collect.\nQuestions: call or WhatsApp 0718 819 413';

        const booking =
            'Hi Pick&Send, I would like to send a parcel.\n\n' +
            lines +
            '\nRoute: ' +
            d.route;

        const pn = norm(f.paynum);
        const other = !!pn && pn !== norm(f.sphone);

        const custMsg = `Hi, ${f.sname.trim()} is sending a parcel with Pick&Send to ${d.town} for ${f.rname.trim()}.\n\nPlease pay ${fmt(p.total)}: M-PESA, Lipa na M-PESA, Buy Goods, Till [TILL NO.].\n\nOnce it is paid, the parcel leaves Nairobi and the recipient gets an SMS code to collect it at our ${d.town} pickup station.\nQuestions: call or WhatsApp 0718 819 413`;

        const who =
            p.mode === 'collect'
                ? [
                      'Who is coming to collect',
                      'Example rider: Kevin M.',
                      'Staff ID PS-R014 · Motorbike [NUMBER PLATE]',
                      'Hand your parcel only to this rider, and only after they tell you this handover code. We never send a different person by phone call or text. If anyone else comes, do not hand over: call or WhatsApp us on 0718 819 413.',
                  ]
                : [
                      'Who receives your parcel',
                      'Example agent: Mary W.',
                      'Agent ID PS-A007 · ' + p.point,
                      'Hand your parcel only to this agent at the counter, and give them this handover code. You get an SMS the moment they scan it in. Do not hand it to anyone outside the station who says they work for us.',
                  ];

        return {
            rows,
            paid: !!code,
            code,
            who,
            other,
            receiptHref: 'https://wa.me/?text=' + encodeURIComponent(receipt),
            bookingHref:
                `https://wa.me/${cfg.wa}?text=` + encodeURIComponent(booking),
            custHref: `https://wa.me/${pn}?text=` + encodeURIComponent(custMsg),
            receipt,
        };
    }

    /* ---------------- validate ---------------- */
    function validate(f: any) {
        const missing: string[] = [];
        const collect = f.hand === 'collect';
        const elec = f.kind === 'e';

        if (!f.sname.trim()) missing.push('your name');
        if (!f.sphone.trim()) missing.push('your phone number');
        if (collect && !f.addr.trim()) missing.push('where your shop is');
        if (!f.rname.trim()) missing.push("the recipient's name");
        if (!f.rphone.trim()) missing.push("the recipient's phone number");
        if (!f.what.trim()) missing.push('what is inside');

        if (
            !collect &&
            f.point &&
            f.point
                .split('|')[1]
                .indexOf(pickTown(f.rtown).town.split(' CBD')[0]) === 0
        ) {
            missing.push('a destination town different from where you drop it');
        }

        if (!toNum(f.worth)) missing.push('the estimated worth of the parcel');
        if (f.paynum.replace(/[^0-9]/g, '').length < 9)
            missing.push('the M-PESA number that will pay');

        const heavy = !elec && f.size === 'kg';
        if (heavy && kgValue(f.kg) > C.maxKg)
            return `Parcels over ${C.maxKg} kg are quoted. Please call or WhatsApp 0718 819 413.`;
        if (heavy && kgValue(f.kg) < 11)
            missing.push('the weight in kg (11 or more)');

        return missing.length
            ? 'Before you continue, please add ' + missing.join(', ') + '.'
            : '';
    }

    /* ---------------- supplies ---------------- */
    function supplyText(s: any) {
        const d = pickTown(s.town);
        return (
            'Hi Pick&Send, please pick something for me in Nairobi.\n\n' +
            `Name: ${s.name.trim()}, ${s.phone.trim()}\n` +
            `Send to: Pick&Send pickup station, ${d.town} (${d.route})\n` +
            `Pick: ${s.what.trim()}\n` +
            `From: ${s.from.trim()}${s.sphone.trim() ? ', ' + s.sphone.trim() : ''}\n` +
            `How often: ${s.often}`
        );
    }

    return {
        price,
        breakdown,
        codNote,
        buildBooking,
        validate,
        supplyText,
        pickTown,
        kgPrice,
        kgPu,
    };
}
