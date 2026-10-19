// src/components/pickandsend/TopStrip.tsx
import { WRAP } from './shared';

export function TopStrip({ wa }: { wa: string }) {
    return (
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
                    <a className="text-white" href={`https://wa.me/${wa}`}>
                        <b>0718 819 413</b>
                    </a>
                </span>
            </div>
        </div>
    );
}
