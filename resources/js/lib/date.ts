// resources/js/lib/date.ts

/** Parse YYYY-MM-DD (or ISO) to a local-midnight Date, no TZ shift. */
export function parseDateOnly(s: string): Date {
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
}

/** Format a Date as YYYY-MM-DD in LOCAL time (never UTC). */
export function dateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Trim any ISO string to YYYY-MM-DD. */
export const toDateOnly = (s: string) => s.slice(0, 10);

/** "Mon 12 Feb" style label from a YYYY-MM-DD string. */
export function shortLabel(s: string): string {
    const d = parseDateOnly(s);
    return d.toLocaleDateString('en-KE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
}

/** Inclusive list of YYYY-MM-DD keys between from..to. */
export function dateRangeKeys(from: string, to: string): string[] {
    const out: string[] = [];
    const cur = parseDateOnly(from);
    const end = parseDateOnly(to);
    while (cur <= end) {
        out.push(dateKey(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return out;
}