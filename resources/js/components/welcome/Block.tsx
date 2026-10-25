// src/components/welcome/Block.tsx
import type { ReactNode } from "react";

export function Block({
    id,
    tone,
    children,
}: {
    id: string;
    tone?: "tint" | "band";
    children: ReactNode;
}) {
    const bg =
        tone === "tint"
            ? "bg-ps-surface2"
            : tone === "band"
              ? "bg-ps-band text-ps-bandmuted"
              : "";
    return (
        <section
            id={id}
            className={`scroll-mt-[76px] py-10 md:py-[60px] ${bg}`}
        >
            {children}
        </section>
    );
}
