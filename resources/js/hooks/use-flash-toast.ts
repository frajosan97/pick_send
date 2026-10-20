// resources/js/hooks/use-flash-toast.ts
import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    const last = useRef<string>('');

    useEffect(() => {
        return router.on('navigate', (event) => {
            const page = (event as CustomEvent).detail?.page;
            const data = page?.props?.flash?.toast as FlashToast | undefined;
            if (!data) return;

            // De-dupe so a re-render doesn't double-toast.
            const sig = `${data.type}:${data.message}`;
            if (sig === last.current) return;
            last.current = sig;

            toast[data.type](data.message);
        });
    }, []);
}