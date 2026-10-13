// src/components/pickandsend/Header.tsx
import { ListIcon } from "lucide-react";
import { Wordmark } from "./Wordmark";
import { GHOST, PRIMARY, WRAP, NAV } from "./shared";

export function Header({
    menu,
    setMenu,
}: {
    menu: boolean;
    setMenu: (v: boolean) => void;
}) {
    return (
        <header className="sticky top-0 z-[5] border-b border-ps-line bg-ps-surface">
            <div
                className={`${WRAP} flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5`}
            >
                <a
                    href="#home"
                    aria-label="Pick&Send home"
                    className="flex items-center no-underline"
                >
                    <Wordmark size="text-[1.55rem]" />
                </a>
                <nav
                    aria-label="Site"
                    onClick={() => setMenu(false)}
                    className={`${menu ? "order-last mt-1 flex w-full flex-col border-t border-ps-line" : "hidden"} md:order-none md:mt-0 md:flex md:w-auto md:flex-row md:flex-wrap md:gap-x-3.5 md:border-0`}
                >
                    {NAV.map(([id, t]) => (
                        <a
                            key={id}
                            href={`#${id}`}
                            className="flex min-h-[46px] items-center border-b border-ps-line text-base font-semibold text-ps-ink no-underline last:border-b-0 hover:text-ps-accent md:min-h-11 md:border-0 md:text-[.84rem]"
                        >
                            {t}
                        </a>
                    ))}
                </nav>
                <div className="flex flex-nowrap gap-2">
                    <a
                        href="#merchants"
                        className={`${GHOST} !min-h-11 !px-3 !text-[.86rem] max-lg:hidden`}
                    >
                        Merchant log in
                    </a>
                    <a
                        href="#send"
                        className={`${PRIMARY} !min-h-11 !w-auto !px-3 !text-[.86rem]`}
                    >
                        Send with us
                    </a>
                    <button
                        type="button"
                        aria-expanded={menu}
                        aria-controls="site-nav"
                        onClick={() => setMenu(!menu)}
                        className="min-h-11 rounded-[10px] border-[1.5px] border-ps-line bg-ps-surface px-3 text-[.92rem] font-bold text-ps-brandink md:hidden"
                    >
                        <ListIcon />
                    </button>
                </div>
            </div>
        </header>
    );
}
