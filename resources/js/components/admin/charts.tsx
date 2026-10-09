// resources/js/components/admin/charts.tsx

/* ---------------- Sparkline ---------------- */
export function Sparkline({
    data,
    stroke = 'currentColor',
    className = '',
}: {
    data: number[];
    stroke?: string;
    className?: string;
}) {
    const max = Math.max(1, ...data);
    const pts = data
        .map((v, i) => {
            const x = (i / Math.max(1, data.length - 1)) * 100;
            const y = 30 - (v / max) * 28;
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <svg
            viewBox="0 0 100 30"
            className={`h-10 w-full ${className}`}
            preserveAspectRatio="none"
        >
            <polyline
                fill="none"
                stroke={stroke}
                strokeWidth="1.5"
                points={pts}
            />
        </svg>
    );
}

/* ---------------- Bar chart (single series) ---------------- */
export function BarChart({
    labels,
    values,
    color = '#4FD1C0',
    height = 160,
}: {
    labels: string[];
    values: number[];
    color?: string;
    height?: number;
}) {
    const max = Math.max(1, ...values);

    return (
        <div className="flex items-end gap-1" style={{ height }}>
            {values.map((v, i) => {
                const h = (v / max) * 100;
                return (
                    <div
                        key={i}
                        className="flex flex-1 flex-col items-center gap-1"
                        title={`${labels[i]}: ${v}`}
                    >
                        <div className="flex w-full flex-1 items-end">
                            <div
                                className="w-full rounded-t-[3px] transition-all"
                                style={{ height: `${h}%`, background: color }}
                            />
                        </div>
                        <span className="text-[.62rem] text-neutral-500 dark:text-neutral-400">
                            {labels[i]?.slice(5)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/* ---------------- Dual line chart ---------------- */
export function LineChart({
    labels,
    series,
    height = 180,
}: {
    labels: string[];
    series: { name: string; values: number[]; color: string }[];
    height?: number;
}) {
    const max = Math.max(1, ...series.flatMap((s) => s.values));

    return (
        <div className="flex flex-col gap-2">
            <svg
                viewBox="0 0 100 40"
                preserveAspectRatio="none"
                style={{ height }}
                className="w-full"
            >
                {series.map((s) => {
                    const pts = s.values
                        .map((v, i) => {
                            const x =
                                (i / Math.max(1, s.values.length - 1)) * 100;
                            const y = 39 - (v / max) * 38;
                            return `${x},${y}`;
                        })
                        .join(' ');
                    return (
                        <polyline
                            key={s.name}
                            fill="none"
                            stroke={s.color}
                            strokeWidth="0.6"
                            vectorEffect="non-scaling-stroke"
                            points={pts}
                        />
                    );
                })}
            </svg>
            <div className="flex flex-wrap gap-3 text-[.78rem]">
                {series.map((s) => (
                    <span key={s.name} className="flex items-center gap-1.5">
                        <i
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: s.color }}
                        />
                        {s.name}
                    </span>
                ))}
            </div>
            <div className="flex justify-between text-[.68rem] text-neutral-500 dark:text-neutral-400">
                <span>{labels[0]}</span>
                <span>{labels[Math.floor(labels.length / 2)]}</span>
                <span>{labels[labels.length - 1]}</span>
            </div>
        </div>
    );
}

/* ---------------- Funnel ---------------- */
export function Funnel({
    stages,
}: {
    stages: { status: string; count: number }[];
}) {
    const max = Math.max(1, ...stages.map((s) => s.count));

    return (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
            {stages.map((s, i) => {
                const pct = (s.count / max) * 100;
                const step = `hsl(${160 - i * 10} 60% ${70 - i * 4}%)`;
                return (
                    <li key={s.status} className="flex items-center gap-3">
                        <span className="w-[130px] flex-none text-[.82rem] font-semibold text-neutral-600 capitalize dark:text-neutral-300">
                            {s.status.replace(/_/g, ' ')}
                        </span>
                        <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800">
                            <div
                                className="absolute inset-y-0 left-0 rounded-md"
                                style={{ width: `${pct}%`, background: step }}
                            />
                        </div>
                        <span className="w-14 flex-none text-right font-mono text-[.82rem]">
                            {s.count.toLocaleString('en-KE')}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

/* ---------------- Donut ---------------- */
export function Donut({
    data,
    size = 160,
}: {
    data: { label: string; value: number; color: string }[];
    size?: number;
}) {
    const total = data.reduce((a, b) => a + b.value, 0) || 1;
    const r = size / 2 - 12;
    const cx = size / 2;
    const cy = size / 2;

    let acc = 0;
    const arcs = data.map((d) => {
        const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
        acc += d.value;
        const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        const large = end - start > Math.PI ? 1 : 0;
        const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
        return { ...d, path };
    });

    return (
        <div className="flex items-center gap-4">
            <svg width={size} height={size} className="flex-none">
                <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    className="text-neutral-200 dark:text-neutral-700"
                />
                {arcs.map((a) => (
                    <path
                        key={a.label}
                        d={a.path}
                        fill="none"
                        stroke={a.color}
                        strokeWidth="14"
                        strokeLinecap="butt"
                    />
                ))}
                <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    className="fill-current text-[.9rem] font-bold"
                >
                    {total.toLocaleString('en-KE')}
                </text>
            </svg>
            <ul className="m-0 flex flex-col gap-1.5 p-0 text-[.84rem]">
                {data.map((d) => (
                    <li key={d.label} className="flex items-center gap-2">
                        <i
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: d.color }}
                        />
                        <span className="min-w-[120px] capitalize">
                            {d.label}
                        </span>
                        <b className="tabular-nums">
                            {d.value.toLocaleString('en-KE')}
                        </b>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/* ---------------- KPI card ---------------- */
export function Kpi({
    label,
    value,
    hint,
    trend,
    tone = 'default',
}: {
    label: string;
    value: string;
    hint?: string;
    trend?: number[];
    tone?: 'default' | 'brand' | 'warn';
}) {
    const tones = {
        default: '',
        brand: 'border-ps-brand/30 bg-ps-brand/5',
        warn: 'border-ps-warn/40 bg-ps-warn/10',
    } as const;

    return (
        <div
            className={`flex min-w-0 flex-col gap-1.5 rounded-xl border border-sidebar-border/70 bg-card p-4 dark:border-sidebar-border ${tones[tone]}`}
        >
            <span className="text-[.82rem] font-semibold text-neutral-500 dark:text-neutral-400">
                {label}
            </span>
            <b className="text-[1.5rem] leading-tight font-extrabold tabular-nums">
                {value}
            </b>
            {hint && (
                <span className="text-[.78rem] text-neutral-500 dark:text-neutral-400">
                    {hint}
                </span>
            )}
            {trend && trend.length > 1 && (
                <Sparkline data={trend} className="mt-1 text-ps-accent" />
            )}
        </div>
    );
}
