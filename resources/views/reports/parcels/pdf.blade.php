<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ $parcel->tracking_no }} — Parcel</title>
    <style>
        /* Dompdf-friendly : table layout only, no flexbox/grid, no CSS variables */
        @page {
            size: A4 portrait;
            margin: 12mm 14mm 20mm 14mm;

            /* bottom margin bumped from 14mm → 20mm */
            @bottom-center {
                content: "Generated {{ $generatedAt->format('d M Y') }} · {{ $generatedAt->format('H:i') }} · Pick & Send · {{ $parcel->tracking_no }}";
                font-family: 'Helvetica', 'Arial', sans-serif;
                font-size: 8pt;
                color: #5b6a82;
            }
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10.5pt;
            color: #0b1424;
            margin: 0;
            padding: 0;
            line-height: 1.35;
        }

        /* ---------- brand band ---------- */

        .brand-band {
            background: #0f2747;
            color: #ffffff;
            padding: 10px 14px;
            margin-bottom: 14px;
        }

        .brand-band table {
            width: 100%;
            border-collapse: collapse;
        }

        .brand-band td {
            vertical-align: middle;
            padding: 0;
        }

        .brand-name {
            font-size: 16pt;
            font-weight: 700;
            letter-spacing: 0.03em;
            color: #ffffff;
        }

        .brand-tag {
            font-size: 9pt;
            color: #b9c8e0;
            margin-top: 2px;
        }

        .brand-right {
            text-align: right;
        }

        .tracking {
            font-family: 'Courier New', monospace;
            font-size: 17pt;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #4fd1c0;
        }

        .status-pill {
            display: inline-block;
            padding: 2px 10px;
            border-radius: 10px;
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            background: #4fd1c0;
            color: #062a27;
        }

        /* ---------- handover + money summary row ---------- */

        .top-summary {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }

        .top-summary td {
            vertical-align: top;
            padding: 0;
        }

        .top-summary td.left {
            width: 42%;
            padding-right: 10px;
        }

        .top-summary td.right {
            width: 58%;
        }

        .handover-card {
            background: #e6fbf8;
            border: 2px dashed #0d9488;
            text-align: center;
            padding: 10px 6px;
        }

        .handover-label {
            font-size: 8pt;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #0f766e;
            text-transform: uppercase;
        }

        .handover-code {
            font-family: 'Courier New', monospace;
            font-size: 30pt;
            font-weight: 700;
            letter-spacing: 0.18em;
            line-height: 1;
            color: #0b1424;
            margin-top: 4px;
        }

        .money-card {
            background: #f4f7fc;
            border: 1px solid #d6deec;
            padding: 8px 12px;
        }

        .money-card table {
            width: 100%;
            border-collapse: collapse;
        }

        .money-card td {
            padding: 3px 0;
            font-size: 10pt;
        }

        .money-card td.k {
            color: #5b6a82;
        }

        .money-card td.v {
            text-align: right;
            font-family: 'Courier New', monospace;
            font-weight: 700;
        }

        .money-card tr.total td {
            border-top: 1px solid #0b1424;
            padding-top: 5px;
            font-size: 11.5pt;
        }

        .money-card tr.balance td {
            font-size: 12.5pt;
        }

        .money-card tr.balance td.v {
            color: #b91c1c;
        }

        .money-card tr.balance.settled td.v {
            color: #047857;
        }

        /* ---------- section blocks ---------- */

        .section {
            margin-top: 14px;
            page-break-inside: avoid;
        }

        .section-head {
            background: #eef2f9;
            border-left: 4px solid #0f2747;
            padding: 4px 8px;
            margin-bottom: 6px;
        }

        .section-title {
            font-size: 9pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #0f2747;
            margin: 0;
        }

        /* ---------- two-column split ---------- */

        table.split {
            width: 100%;
            border-collapse: collapse;
        }

        table.split>tbody>tr>td {
            width: 50%;
            vertical-align: top;
            padding: 0 8px 0 0;
        }

        table.split>tbody>tr>td:last-child {
            padding: 0 0 0 8px;
        }

        /* ---------- key-value ---------- */

        table.kv {
            width: 100%;
            border-collapse: collapse;
        }

        table.kv td {
            padding: 3px 0;
            font-size: 10pt;
            vertical-align: top;
        }

        table.kv td.label {
            color: #5b6a82;
            width: 42%;
        }

        table.kv td.value {
            text-align: right;
            font-weight: 600;
        }

        table.kv td.value.mono {
            font-family: 'Courier New', monospace;
            font-size: 9.5pt;
            font-weight: 400;
        }

        /* ---------- data table ---------- */

        table.data {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
        }

        table.data th {
            text-align: left;
            font-size: 8pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #ffffff;
            background: #0f2747;
            padding: 5px 6px;
        }

        table.data td {
            padding: 4px 6px;
            border-bottom: 1px solid #d6deec;
            vertical-align: top;
        }

        table.data tr:nth-child(even) td {
            background: #f8fafc;
        }

        table.data td.num {
            text-align: right;
            font-family: 'Courier New', monospace;
            white-space: nowrap;
        }

        table.data td.mono {
            font-family: 'Courier New', monospace;
            font-size: 8.5pt;
        }

        /* ---------- status pills ---------- */

        .pill {
            display: inline-block;
            padding: 1px 8px;
            border-radius: 9px;
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .pill-success {
            background: #d1fae5;
            color: #065f46;
        }

        .pill-pending {
            background: #fef3c7;
            color: #92400e;
        }

        .pill-failed {
            background: #fee2e2;
            color: #991b1b;
        }

        .pill-mpesa {
            background: #d1fae5;
            color: #065f46;
        }

        .pill-cash {
            background: #fef3c7;
            color: #92400e;
        }

        .pill-wallet {
            background: #dbeafe;
            color: #1e40af;
        }

        .pill-other {
            background: #e5e7eb;
            color: #374151;
        }

        /* ---------- events ---------- */

        table.events {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
        }

        table.events td {
            padding: 4px 0;
            border-bottom: 1px dashed #d6deec;
            vertical-align: top;
        }

        table.events td.when {
            width: 32%;
            color: #5b6a82;
            font-size: 8.5pt;
        }

        table.events td.what {
            width: 68%;
        }

        table.events .event-title {
            font-weight: 600;
        }

        table.events .event-desc {
            color: #5b6a82;
            font-size: 8.5pt;
            margin-top: 1px;
        }

        /* ---------- print ---------- */

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>

<body>

    {{-- ================= brand band ================= --}}
    <div class="brand-band">
        <table>
            <tr>
                <td>
                    <div class="brand-name">Pick &amp; Send</div>
                    <div class="brand-tag">Parcel slip · {{ $generatedAt->format('d M Y · H:i') }}</div>
                </td>
                <td class="brand-right">
                    <span class="status-pill">{{ str_replace('_', ' ', $parcel->status) }}</span>
                    <div class="tracking">{{ $parcel->tracking_no }}</div>
                </td>
            </tr>
        </table>
    </div>

    {{-- ================= handover + money summary ================= --}}
    <table class="top-summary">
        <tr>
            <td class="left">
                @if ($parcel->handover_code)
                    <div class="handover-card">
                        <div class="handover-label">Handover code</div>
                        <div class="handover-code">{{ $parcel->handover_code }}</div>
                    </div>
                @endif
            </td>
            <td class="right">
                <div class="money-card">
                    <table>
                        <tr>
                            <td class="k">Delivery fee</td>
                            <td class="v">KSh {{ number_format((int) $parcel->delivery_fee) }}</td>
                        </tr>
                        <tr>
                            <td class="k">Packaging</td>
                            <td class="v">KSh {{ number_format((int) $parcel->pack_fee) }}</td>
                        </tr>
                        <tr>
                            <td class="k">Drop-off fee</td>
                            <td class="v">KSh {{ number_format((int) $parcel->drop_off_fee) }}</td>
                        </tr>
                        <tr>
                            <td class="k">COD amount</td>
                            <td class="v">KSh {{ number_format((int) $parcel->cod_amount) }}</td>
                        </tr>
                        <tr>
                            <td class="k">COD fee</td>
                            <td class="v">KSh {{ number_format((int) $parcel->cod_fee) }}</td>
                        </tr>
                        <tr class="total">
                            <td class="k" style="font-weight:700;color:#0b1424;">Total</td>
                            <td class="v">KSh {{ number_format((int) $parcel->total) }}</td>
                        </tr>
                        <tr>
                            <td class="k">Paid</td>
                            <td class="v" style="color:#047857;">KSh {{ number_format((int) $parcel->amount_paid) }}
                            </td>
                        </tr>
                        <tr class="balance {{ $parcel->balanceDue() > 0 ? '' : 'settled' }}">
                            <td class="k" style="font-weight:700;color:#0b1424;">Balance due</td>
                            <td class="v">KSh {{ number_format($parcel->balanceDue()) }}</td>
                        </tr>
                    </table>
                </div>
            </td>
        </tr>
    </table>

    {{-- ================= sender / recipient ================= --}}
    <table class="split">
        <tr>
            <td>
                <div class="section-head">
                    <div class="section-title">Sender</div>
                </div>
                <div style="font-weight:700;font-size:11pt;">
                    {{ $parcel->sender?->business_name ?? $parcel->sender?->name ?? $parcel->sender_name }}
                </div>
                <div class="muted" style="font-family:'Courier New',monospace; font-size:10pt; color:#5b6a82;">
                    {{ $parcel->sender?->phone ?? $parcel->sender_phone }}
                </div>
            </td>
            <td>
                <div class="section-head">
                    <div class="section-title">Recipient</div>
                </div>
                <div style="font-weight:700;font-size:11pt;">
                    {{ $parcel->recipient?->name ?? $parcel->recipient_name }}
                </div>
                <div class="muted" style="font-family:'Courier New',monospace; font-size:10pt; color:#5b6a82;">
                    {{ $parcel->recipient?->phone ?? $parcel->recipient_phone }}
                </div>
            </td>
        </tr>
    </table>

    {{-- ================= destination / contents ================= --}}
    <table class="split">
        <tr>
            <td>
                <div class="section-head">
                    <div class="section-title">Destination</div>
                </div>
                <table class="kv">
                    <tr>
                        <td class="label">Town</td>
                        <td class="value">{{ $parcel->town?->name ?? '—' }}</td>
                    </tr>
                    <tr>
                        <td class="label">Route</td>
                        <td class="value">{{ $parcel->town?->route?->name ?? '—' }}</td>
                    </tr>
                </table>
            </td>
            <td>
                <div class="section-head">
                    <div class="section-title">Contents</div>
                </div>
                <table class="kv">
                    <tr>
                        <td class="label">Description</td>
                        <td class="value">{{ $parcel->contents_description }}</td>
                    </tr>
                    <tr>
                        <td class="label">Kind</td>
                        <td class="value">{{ ucfirst($parcel->kind) }}</td>
                    </tr>
                    <tr>
                        <td class="label">Weight</td>
                        <td class="value">
                            {{ $parcel->weight_kg !== null
    ? number_format((float) $parcel->weight_kg, 2) . ' kg'
    : ($parcel->weight_code ?? '—') }}
                        </td>
                    </tr>
                    <tr>
                        <td class="label">Packaging</td>
                        <td class="value">{{ $parcel->needs_packaging ? 'Yes' : 'No' }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    {{-- ================= payments ================= --}}
    <div class="section">
        <div class="section-head">
            <div class="section-title">Payments ({{ $parcel->payments->count() }})</div>
        </div>
        @if ($parcel->payments->isEmpty())
            <div style="color:#5b6a82; font-size:9.5pt;">No payments recorded.</div>
        @else
            <table class="data">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th style="text-align:right;">Amount</th>
                        <th>Reference</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($parcel->payments as $pay)
                        @php
                            $tx = $pay->mpesaTransaction;      // singular receipt
                            $method = $pay->method();          // 'mpesa' | 'cash'
                            $receipt = $tx?->mpesa_receipt_number;

                            $statusPill = match ($pay->status) {
                                'success' => 'pill-success',
                                'pending' => 'pill-pending',
                                'failed' => 'pill-failed',
                                default => 'pill-other',
                            };

                            $methodPill = match ($method) {
                                'mpesa' => 'pill-mpesa',
                                'cash' => 'pill-cash',
                                'wallet' => 'pill-wallet',
                                default => 'pill-other',
                            };
                        @endphp
                        <tr>
                            <td>{{ $pay->created_at?->format('d M H:i') ?? '—' }}</td>
                            <td>{{ strtoupper($pay->type) }}</td>
                            <td>
                                <span class="pill {{ $methodPill }}">{{ strtoupper($method) }}</span>
                            </td>
                            <td>
                                <span class="pill {{ $statusPill }}">{{ strtoupper($pay->status) }}</span>
                            </td>
                            <td class="num">KSh {{ number_format((int) $pay->amount) }}</td>
                            <td class="mono">{{ $receipt ?? $pay->reference ?? '—' }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    </div>

    {{-- ================= events ================= --}}
    @if ($parcel->events->isNotEmpty())
        <div class="section">
            <div class="section-head">
                <div class="section-title">Recent events</div>
            </div>
            <table class="events">
                <tbody>
                    @foreach ($parcel->events->take(6) as $event)
                        <tr>
                            <td class="when">{{ $event->happened_at?->format('d M Y · H:i') }}</td>
                            <td class="what">
                                <div class="event-title">{{ $event->label }}</div>
                                @if ($event->description)
                                    <div class="event-desc">{{ $event->description }}</div>
                                @endif
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    @endif

    {{-- ================= footer ================= --}}
    {{-- ================= PDF page footer (Dompdf only) ================= --}}
    @if ($mode === 'pdf')
        <script type="text/php">
                        if (isset($pdf)) {
                            $text = 'Generated '
                                . $generatedAt->format('d M Y')
                                . ' · '
                                . $generatedAt->format('H:i')
                                . ' · Pick & Send · '
                                . $parcel->tracking_no;

                            $font = $fontMetrics->get_font('Helvetica', 'normal');
                            $size = 8;
                            $color = [0.36, 0.42, 0.51];
                            $y = $pdf->get_height() - 28;

                            $pdf->page_text(
                                40,
                                $y,
                                $text,
                                $font,
                                $size,
                                $color
                            );

                            $pdf->page_text(
                                $pdf->get_width() - 100,
                                $y,
                                'Page {PAGE_NUM} of {PAGE_COUNT}',
                                $font,
                                $size,
                                $color
                            );
                        }
                    </script>
    @endif

</body>

</html>