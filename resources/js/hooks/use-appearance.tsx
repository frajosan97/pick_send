import { useSyncExternalStore } from "react";

export type ResolvedAppearance = "light" | "dark";
export type Appearance = ResolvedAppearance | "system";

export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();

const getCookie = (name: string): string | null => {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(
        new RegExp("(?:^|; )" + name + "=([^;]*)"),
    );
    return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string, days = 365): void => {
    if (typeof document === "undefined") return;
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const prefersDark = (): boolean =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * Read the initial appearance.
 *
 * Priority:
 *   1. The cookie (server's source of truth, kept in sync with SSR)
 *   2. The `dark` class the server already rendered on <html>
 *   3. 'system'
 *
 * We deliberately do NOT read localStorage — the cookie is the single
 * source of truth shared with the server. Two sources = drift = flashes.
 */
const readInitialAppearance = (): Appearance => {
    if (typeof window === "undefined") return "system";

    const cookie = getCookie("appearance") as Appearance | null;
    if (cookie === "light" || cookie === "dark" || cookie === "system") {
        return cookie;
    }

    // No cookie yet — trust what the server rendered on <html>.
    if (document.documentElement.classList.contains("dark")) {
        return "dark";
    }

    return "system";
};

// Initialize synchronously at module load so the very first render
// of any component using this hook already has the right value.
let currentAppearance: Appearance = readInitialAppearance();

const isDarkMode = (appearance: Appearance): boolean =>
    appearance === "dark" || (appearance === "system" && prefersDark());

const applyTheme = (appearance: Appearance): void => {
    if (typeof document === "undefined") return;

    const isDark = isDarkMode(appearance);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
};

const subscribe = (callback: () => void) => {
    listeners.add(callback);
    return () => {
        listeners.delete(callback);
    };
};

const notify = (): void => listeners.forEach((l) => l());

const handleSystemThemeChange = (): void => {
    // Only react if the user is on 'system'
    if (currentAppearance === "system") {
        applyTheme("system");
    }
};

/**
 * Call once at app boot (e.g. in `app.tsx` before createRoot/createInertiaApp).
 * Idempotent — safe to call on every page load.
 */
export function initializeTheme(): void {
    if (typeof window === "undefined") return;

    currentAppearance = readInitialAppearance();

    // Persist what we resolved so the next request's SSR matches.
    setCookie("appearance", currentAppearance);

    // Ensure the DOM reflects the resolved appearance (no-op if SSR
    // already rendered `dark`, but fixes the `system`-on-dark-OS case).
    applyTheme(currentAppearance);

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", handleSystemThemeChange);
}

export function useAppearance(): UseAppearanceReturn {
    const appearance: Appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => currentAppearance, // server snapshot = client snapshot
    );

    const resolvedAppearance: ResolvedAppearance = isDarkMode(appearance)
        ? "dark"
        : "light";

    const updateAppearance = (mode: Appearance): void => {
        currentAppearance = mode;
        setCookie("appearance", mode); // cookie is the source of truth
        applyTheme(mode);
        notify();
    };

    return { appearance, resolvedAppearance, updateAppearance } as const;
}
