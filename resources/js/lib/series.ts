// resources/js/lib/series.ts
import { dateKey, dateRangeKeys, parseDateOnly, toDateOnly } from './date';

export type SeriesPoint = {
    date: string;
    parcels: number;
    revenue: number;
    cod: number;
};

/**
 * Guarantee every calendar day in [from..to] exists exactly once,
 * sorted ascending. Missing days become zeros. Duplicate days are summed.
 * Also normalizes any ISO timestamps to YYYY-MM-DD keys.
 */
export function densifySeries(
    raw: SeriesPoint[],
    from: string,
    to: string,
): SeriesPoint[] {
    const acc = new Map<string, SeriesPoint>();
    for (const r of raw) {
        const key = toDateOnly(r.date);
        const prev = acc.get(key);
        if (prev) {
            prev.parcels += r.parcels;
            prev.revenue += r.revenue;
            prev.cod += r.cod;
        } else {
            acc.set(key, {
                date: key,
                parcels: r.parcels,
                revenue: r.revenue,
                cod: r.cod,
            });
        }
    }
    return dateRangeKeys(from, to).map(
        (key) =>
            acc.get(key) ?? { date: key, parcels: 0, revenue: 0, cod: 0 },
    );
}

/** Sum a metric across a densified series. */
export const sumBy = (s: SeriesPoint[], k: keyof SeriesPoint) =>
    s.reduce((a, p) => a + (typeof p[k] === 'number' ? (p[k] as number) : 0), 0);