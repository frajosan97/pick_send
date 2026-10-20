export type SeriesPoint = {
    date: string;
    parcels: number;
    booked_revenue: number;
    collected: number;
};

export function densifySeries(
    points: SeriesPoint[],
    from: string,
    to: string,
): SeriesPoint[] {
    const byDate = new Map(points.map((p) => [p.date, p]));
    const out: SeriesPoint[] = [];

    const cursor = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);

    while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        out.push(
            byDate.get(key) ?? {
                date: key,
                parcels: 0,
                booked_revenue: 0,
                collected: 0,
            },
        );
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return out;
}