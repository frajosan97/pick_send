// src/components/pickandsend/Wordmark.tsx
export function Wordmark({
    onBand = false,
    size = "text-[1.35rem]",
}: {
    onBand?: boolean;
    size?: string;
}) {
    // One source of truth for the accent color used by the dot, rule, and arrow
    const accent = onBand ? "bg-ps-key" : "bg-ps-accent";
    const accentBorder = onBand ? "border-l-ps-key" : "border-l-ps-accent";
    const ampersand = onBand ? "text-ps-key" : "text-ps-accent";
    // Wordmark itself is always the theme's strong ink — flips with .dark
    const wordmark = "text-ps-ink";

    return (
        <span className="inline-flex flex-col gap-[3px]">
            <span
                className={`${size} leading-none font-extrabold tracking-[-.03em] ${wordmark}`}
            >
                Pick
                <i className={`not-italic ${ampersand}`}>&amp;</i>
                Send
            </span>

            <span className="flex h-2.5 items-center" aria-hidden="true">
                <span
                    className={`h-[9px] w-[9px] flex-none rounded-full ${accent}`}
                />
                <span className={`h-[3.5px] flex-1 ${accent}`} />
                <span
                    className={`h-0 w-0 flex-none border-y-[5px] border-l-[9px] border-y-transparent ${accentBorder}`}
                />
            </span>
        </span>
    );
}
