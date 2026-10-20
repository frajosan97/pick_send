// resources/js/components/admin/money.tsx
export function money(n: number | null | undefined): string {
    if (n == null) return "—";
    return "KSh " + Math.round(n).toLocaleString("en-KE");
}

export function num(n: number | null | undefined): string {
    if (n == null) return "—";
    return Math.round(n).toLocaleString("en-KE");
}
