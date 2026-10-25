// src/components/welcome/Header.tsx
import { ListIcon, XIcon } from "lucide-react";
import { router } from "@inertiajs/react";
import { Wordmark } from "../wordmark";
import { GHOST, PRIMARY, WRAP, NAV } from "./shared";
import type { AuthUser } from "./shared";

export function Header({
    menu,
    setMenu,
    user,
}: {
    menu: boolean;
    setMenu: (v: boolean) => void;
    user: AuthUser | null;
}) {
    // Treat as signed-in merchant only when the flag is set and user exists.
    const merchant = user?.is_merchant ? user : null;

    const logout = () =>
        router.post("/merchants/logout", {}, { preserveScroll: true });

    return (
        <header className="sticky top-0 z-[5] border-b border-ps-line bg-ps-surface/95 backdrop-blur supports-[backdrop-filter]:bg-ps-surface/80">
            <div
                className={`${WRAP} flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5`}
            >
                <a
                    href="/#home"
                    aria-label="Pick&Send home"
                    className="flex shrink-0 items-center no-underline"
                >
                    <Wordmark size="text-[clamp(1.25rem,2.6vw,1.55rem)]" />
                </a>

                <nav
                    id="site-nav"
                    aria-label="Site"
                    onClick={() => setMenu(false)}
                    className={[
                        "min-w-0",
                        menu
                            ? "order-last mt-1 flex w-full flex-col border-t border-ps-line"
                            : "hidden",
                        "lg:order-none lg:mt-0 lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:flex-wrap lg:justify-center lg:gap-x-1 lg:border-0",
                    ].join(" ")}
                >
                    {NAV.map(([id, t]) => (
                        <a
                            key={id}
                            href={`/#${id}`}
                            className="flex min-h-11 items-center border-b border-ps-line px-1 text-[.95rem] font-semibold text-ps-ink no-underline transition-colors last:border-b-0 hover:text-ps-accent lg:min-h-0 lg:rounded-md lg:border-0 lg:px-3 lg:py-2 lg:text-[.84rem] lg:hover:bg-ps-surface2"
                        >
                            {t}
                        </a>
                    ))}
                </nav>

                <div className="flex flex-none items-center gap-2">
                    {merchant ? (
                        <button
                            type="button"
                            onClick={logout}
                            className={`${GHOST} min-h-10 px-3 text-[.86rem] sm:min-h-11 sm:px-4`}
                        >
                            Log out
                        </button>
                    ) : (
                        <a
                            href="#merchants"
                            className={`${GHOST} min-h-10 px-3 text-[.86rem] sm:min-h-11 sm:px-4`}
                        >
                            Merchant log in
                        </a>
                    )}

                    <a
                        href="#send"
                        className={`${PRIMARY} min-h-10 px-3 text-[.86rem] sm:min-h-11 sm:px-4`}
                    >
                        Send with us
                    </a>
                    <button
                        type="button"
                        aria-expanded={menu}
                        aria-controls="site-nav"
                        aria-label={menu ? "Close menu" : "Open menu"}
                        onClick={() => setMenu(!menu)}
                        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-[10px] border-[1.5px] border-ps-line bg-ps-surface px-2.5 text-ps-brandink transition-colors hover:bg-ps-surface2 lg:hidden"
                    >
                        {menu ? <XIcon size={20} /> : <ListIcon size={20} />}
                    </button>
                </div>
            </div>
        </header>
    );
}
