// resources/js/components/admin/charts.tsx
import { useMemo, useState } from 'react';
import { shortLabel } from '@/lib/date';

/* ----------------------------- shared geometry ---------------------------- */
const PAD = { top: 12, right: 16, bottom: 28, left: 48 } as const;
const VB_W = 640;
const VB_H = 220;
const PLOT_W = VB_W - PAD.left - PAD.right;
const PLOT_H = VB_H - PAD.top - PAD.bottom;

const niceMax = (n: number) => {
    if (n <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(n)));
    const norm = n / mag;
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
    return step * mag;
};

/** Equal-slot x position; centers the i-th of n categories. */
const slotX = (i: number, n: number) =>
    PAD.left + ((i + 0.5) * PLOT_W) / Math.max(n, 1);

/* --------------------------------- Kpi ----------------------------------- */
export function Kpi({
    label,
    value,
    hint,
    trend,
    tone = 'neutral',
}: {
    label: string;
    value: string;
    hint?: string;
    trend?: number[];
    tone?: 'neutral' | 'brand' | 'warn';
}) {
    const color =
        tone === 'brand' ? '#4FD1C0' : tone === 'warn' ? '#E3B04B' : '#94a3b8';
    const spark = useMemo(() => {
        if (!trend || trend.length < 2) return null;
        const max = Math.max(...trend, 1);
        const w = 100;
        const h = 28;
        const pts = trend
            .map((v, i) => {
                const x = (i / (trend.length - 1)) * w;
                const y = h - (v / max) * h;
                return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(' ');
        return { pts, w, h, color };
    }, [trend, color]);

    return (
        <div className="rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border">
            <p className="text-[.78rem] tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                {label}
            </p>
            <p className="mt-1 text-[1.45rem] font-bold tabular-nums">
                {value}
            </p>
            {hint && (
                <p className="mt-0.5 text-[.78rem] text-neutral-500 dark:text-neutral-400">
                    {hint}
                </p>
            )}
            {spark && (
                <svg
                    viewBox={`0 0 ${spark.w} ${spark.h}`}
                    className="mt-2 h-7 w-full"
                    preserveAspectRatio="none"
                >
                    <polyline
                        points={spark.pts}
                        fill="none"
                        stroke={spark.color}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                    />
                </svg>
            )}
        </div>
    );
}

/* ------------------------------- BarChart -------------------------------- */
export function BarChart({
    labels,
    values,
    color = '#4FD1C0',
    height = VB_H,
}: {
    labels: string[];
    values: number[];
    color?: string;
    height?: number;
}) {
    const n = labels.length;
    const max = niceMax(Math.max(...values, 0));
    const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max];
    const barW = (PLOT_W / Math.max(n, 1)) * 0.6;

    // show at most ~7 x labels, evenly spaced
    const labelStep = Math.max(1, Math.ceil(n / 7));

    return (
        <svg viewBox={`0 0 ${VB_W} ${height}`} className="w-full" role="img">
            {/* y grid + ticks */}
            {ticks.map((t, i) => {
                const y = PAD.top + PLOT_H - (t / max) * PLOT_H;
                return (
                    <g key={i}>
                        <line
                            x1={PAD.left}
                            x2={PAD.left + PLOT_W}
                            y1={y}
                            y2={y}
                            stroke="currentColor"
                            strokeOpacity={0.08}
                        />
                        <text
                            x={PAD.left - 6}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="10"
                            fill="currentColor"
                            fillOpacity={0.55}
                        >
                            {Math.round(t).toLocaleString('en-KE')}
                        </text>
                    </g>
                );
            })}
            {/* bars */}
            {values.map((v, i) => {
                const x = slotX(i, n) - barW / 2;
                const h = (v / max) * PLOT_H;
                const y = PAD.top + PLOT_H - h;
                return (
                    <rect
                        key={i}
                        x={x}
                        y={y}
                        width={barW}
                        height={Math.max(h, v > 0 ? 1 : 0)}
                        rx={2}
                        fill={color}
                    >
                        <title>{`${labels[i]} — ${v}`}</title>
                    </rect>
                );
            })}
            {/* x labels aligned to slot centers */}
            {labels.map((l, i) =>
                i % labelStep === 0 ? (
                    <text
                        key={i}
                        x={slotX(i, n)}
                        y={height - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fill="currentColor"
                        fillOpacity={0.6}
                    >
                        {shortLabel(l)}
                    </text>
                ) : null,
            )}
        </svg>
    );
}

/* ------------------------------- LineChart ------------------------------- */
export function LineChart({
    labels,
    series,
    height = VB_H,
}: {
    labels: string[];
    series: { name: string; values: number[]; color: string }[];
    height?: number;
}) {
    const n = labels.length;
    const max = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
    const ticks = [0, max * 0.25, max * 0.5, max * 0.75, max];
    const labelStep = Math.max(1, Math.ceil(n / 7));

    return (
        <div>
            <svg
                viewBox={`0 0 ${VB_W} ${height}`}
                className="w-full"
                role="img"
            >
                {ticks.map((t, i) => {
                    const y = PAD.top + PLOT_H - (t / max) * PLOT_H;
                    return (
                        <g key={i}>
                            <line
                                x1={PAD.left}
                                x2={PAD.left + PLOT_W}
                                y1={y}
                                y2={y}
                                stroke="currentColor"
                                strokeOpacity={0.08}
                            />
                            <text
                                x={PAD.left - 6}
                                y={y + 3}
                                textAnchor="end"
                                fontSize="10"
                                fill="currentColor"
                                fillOpacity={0.55}
                            >
                                {Math.round(t).toLocaleString('en-KE')}
                            </text>
                        </g>
                    );
                })}

                {series.map((s) => {
                    const pts = s.values
                        .map((v, i) => {
                            const x = slotX(i, n);
                            const y = PAD.top + PLOT_H - (v / max) * PLOT_H;
                            return `${x.toFixed(2)},${y.toFixed(2)}`;
                        })
                        .join(' ');
                    return (
                        <g key={s.name}>
                            <polyline
                                points={pts}
                                fill="none"
                                stroke={s.color}
                                strokeWidth="2"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                            {s.values.map((v, i) => (
                                <circle
                                    key={i}
                                    cx={slotX(i, n)}
                                    cy={PAD.top + PLOT_H - (v / max) * PLOT_H}
                                    r={2.5}
                                    fill={s.color}
                                >
                                    <title>{`${labels[i]} — ${s.name}: ${v}`}</title>
                                </circle>
                            ))}
                        </g>
                    );
                })}

                {labels.map((l, i) =>
                    i % labelStep === 0 ? (
                        <text
                            key={i}
                            x={slotX(i, n)}
                            y={height - 8}
                            textAnchor="middle"
                            fontSize="10"
                            fill="currentColor"
                            fillOpacity={0.6}
                        >
                            {shortLabel(l)}
                        </text>
                    ) : null,
                )}
            </svg>

            {/* aligned legend */}
            <div className="mt-2 flex flex-wrap gap-4 text-[.78rem]">
                {series.map((s) => (
                    <span key={s.name} className="flex items-center gap-1.5">
                        <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ background: s.color }}
                        />
                        {s.name}
                    </span>
                ))}
            </div>
        </div>
    );
}

/* -------------------------------- Funnel --------------------------------- */
export function Funnel({
    stages,
}: {
    stages: { status: string; count: number }[];
}) {
    const max = Math.max(1, ...stages.map((s) => s.count));
    return (
        <div className="flex flex-col gap-2">
            {stages.map((s) => {
                const w = Math.max(4, (s.count / max) * 100);
                return (
                    <div key={s.status} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 truncate text-[.82rem] capitalize">
                            {s.status.replace(/_/g, ' ')}
                        </span>
                        <div className="h-4 flex-1 rounded bg-neutral-100 dark:bg-neutral-800">
                            <div
                                className="h-4 rounded bg-[#4FD1C0]"
                                style={{ width: `${w}%` }}
                            />
                        </div>
                        <span className="w-12 shrink-0 text-right text-[.82rem] tabular-nums">
                            {s.count.toLocaleString('en-KE')}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/* -------------------------------- Donut ---------------------------------- */
export function Donut({
    data,
}: {
    data: { label: string; value: number; color: string }[];
}) {
    const [hover, setHover] = useState<string | null>(null);
    const total = data.reduce((a, d) => a + d.value, 0) || 1;
    const R = 60;
    const C = 2 * Math.PI * R;
    let offset = 0;

    return (
        <div className="flex flex-wrap items-center gap-6">
            <svg viewBox="0 0 160 160" className="h-40 w-40" role="img">
                <g transform="translate(80,80) rotate(-90)">
                    {data.map((d) => {
                        const frac = d.value / total;
                        const dash = frac * C;
                        const el = (
                            <circle
                                key={d.label}
                                r={R}
                                fill="none"
                                stroke={d.color}
                                strokeWidth={hover === d.label ? 26 : 20}
                                strokeDasharray={`${dash} ${C - dash}`}
                                strokeDashoffset={-offset}
                                style={{ transition: 'stroke-width .15s' }}
                                onMouseEnter={() => setHover(d.label)}
                                onMouseLeave={() => setHover(null)}
                            />
                        );
                        offset += dash;
                        return el;
                    })}
                </g>
                <text
                    x="80"
                    y="78"
                    textAnchor="middle"
                    fontSize="11"
                    fill="currentColor"
                    fillOpacity={0.55}
                >
                    Total
                </text>
                <text
                    x="80"
                    y="94"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="700"
                    fill="currentColor"
                >
                    {Math.round(total).toLocaleString('en-KE')}
                </text>
            </svg>

            {/* legend ordered identically to slices */}
            <ul className="flex flex-col gap-1 text-[.82rem]">
                {data.map((d) => (
                    <li
                        key={d.label}
                        className="flex items-center gap-2"
                        onMouseEnter={() => setHover(d.label)}
                        onMouseLeave={() => setHover(null)}
                    >
                        <span
                            className="inline-block h-2.5 w-2.5 rounded-sm"
                            style={{ background: d.color }}
                        />
                        <span className="capitalize">
                            {d.label.replace(/_/g, ' ')}
                        </span>
                        <span className="ml-auto text-neutral-500 tabular-nums">
                            {((d.value / total) * 100).toFixed(1)}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
