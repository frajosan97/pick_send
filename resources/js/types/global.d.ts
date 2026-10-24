// src/types/global.d.ts
import type { Auth } from '@/types/auth';
import type { AppConfig, Flash } from '@/types/pickandsend';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            config: AppConfig;
            flash: Flash;
            [key: string]: unknown;
        };
    }
}