// src/components/pickandsend/Pricing.tsx
import type { Config } from "@/types/config";
import { fmt, num } from "@/lib/pricing";
import { Block } from "./Block";
import { SectionHead } from "./SectionHead";
import { Table } from "./FormBits";
import { EYEBROW, FACTS, H3, PRIMARY, WRAP } from "./shared";

export function Pricing({ config }: { config: Config }) {
    const {
        general: GENERAL,
        elec: ELEC,
        satellites: SATELLITES,
        constants,
    } = config;
    const {
        base10: BASE10,
        perKg: PER_KG,
        maxKg: MAX_KG,
        dropOffFee,
    } = constants;

    const kgPrice = (n: number) =>
        n <= 10 ? BASE10 : BASE10 + (n - 10) * PER_KG;

    return (
        <Block id="pricing">
            <div className={WRAP}>
                <SectionHead
                    eyebrow="Pricing"
                    title="From KSh 199, one price to every town"
                    text="The same price to Mombasa, Meru, Eldoret or Kisumu."
                >
                    <div className="mb-2 grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-3">
                        {[
                            ["Bring it to our CBD point", "Free"],
                            ["We pick up from your CBD shop", "Free"],
                            [
                                "Bring it to our agent in a Nairobi satellite town",
                                `From ${fmt(dropOffFee)}, at ${SATELLITES.join(", ")}`,
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
                        head={["Weight", "Delivery price (KSh)"]}
                        rows={GENERAL.map((x) => (
                            <tr
                                key={x.id}
                                className={`group ${x.perKg ? "bg-ps-soft text-ps-softink" : ""}`}
                            >
                                <td className="border-b border-ps-line px-4 py-[13px] font-semibold group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]">
                                    {x.label}
                                </td>
                                <td className="border-b border-ps-line px-4 py-[13px] text-right group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]">
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
                    Tap a group to see its prices. CBD pickup is free for
                    anything a rider can carry.
                </p>
                <div className="flex max-w-[46rem] flex-col gap-2.5">
                    {ELEC.map((g) => (
                        <details
                            key={g.group}
                            className="rounded-xl border border-ps-line bg-ps-surface px-[18px]"
                        >
                            <summary className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 font-bold">
                                {g.group.replace(", by weight", "")}
                                <span className="font-semibold whitespace-nowrap text-ps-muted">
                                    {`from ${fmt(Math.min(...g.items.map((i) => i.p)))}`}
                                </span>
                            </summary>
                            <div className="mb-2.5 [&_td]:!px-2 [&_td]:!py-2.5 [&_td:first-child]:!pl-0 [&_td:last-child]:!pr-0 [&_th]:!px-2 [&_th]:!py-2.5 [&_th:first-child]:!pl-0 [&_th:last-child]:!pr-0">
                                <Table
                                    small
                                    head={["Item", "Delivery", "CBD pickup"]}
                                    rows={g.items.map((it) => (
                                        <tr key={it.id} className="group">
                                            <td className="border-b border-ps-line px-4 py-[13px] group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]">
                                                {it.label}
                                            </td>
                                            <td className="border-b border-ps-line px-4 py-[13px] text-right group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]">
                                                {num(it.p)}
                                            </td>
                                            <td className="border-b border-ps-line px-4 py-[13px] text-right group-last:border-b-0 max-sm:px-1.5 max-sm:py-2.5 max-sm:text-[.86rem]">
                                                {it.pu <= 100
                                                    ? "Free"
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
                            Bulk items: get a quote, call or WhatsApp 0718 819
                            413
                        </b>
                    </li>
                </ul>
                <div className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-center gap-[18px] rounded-2xl bg-ps-soft p-4 text-ps-softink sm:px-6 sm:py-[22px]">
                    <div>
                        <span className={EYEBROW}>Pick&amp;Send points</span>
                        <h3 className="mt-1 text-[1.35rem] font-extrabold text-ps-brandink">
                            Every parcel earns you points
                        </h3>
                    </div>
                    <ul className="m-0 flex flex-col gap-1.5 pl-5">
                        <li>
                            <b>Earn 2 points</b> for every KSh 100 you spend on
                            delivery.
                        </li>
                        <li>
                            <b>1 point is KSh 1 off</b> your next parcel.
                        </li>
                        <li>
                            <b>Use them from 100 points.</b> They are saved
                            under your phone number.
                        </li>
                    </ul>
                </div>
            </div>
        </Block>
    );
}
