import { usePage } from '@inertiajs/react';

import AppLogoIcon from '@/components/app-logo-icon';
import type { Config } from '@/types/config';

export default function AppLogo() {
    const { name, config } = usePage<{
        name?: string;
        config?: Config;
    }>().props;

    const brand = name ?? config?.name ?? 'Pick&Send';

    return (
        <>
            <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-ps-ink text-ps-accent shadow-sm ring-1 ring-ps-ink/10">
                <AppLogoIcon className="size-6 fill-current" />
            </div>
            <div className="ml-2.5 grid flex-1 text-left">
                <span className="truncate text-base leading-none font-extrabold tracking-tight">
                    {brand}
                </span>
                <span className="mt-1 truncate font-mono text-[10px] leading-none tracking-wider text-ps-muted uppercase">
                    Pick up · Send
                </span>
            </div>
        </>
    );
}
