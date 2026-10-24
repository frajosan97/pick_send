// src/components/pickandsend/Wordmark.tsx
export function Wordmark({
    onBand = false,
    size = "text-[1.35rem]",
    invert = false,
}: {
    onBand?: boolean;
    size?: string;
    /**
     * Use the inverse ink for the wordmark text.
     * Light theme → dark-theme ink; dark theme → light-theme ink.
     * Only enable this on a surface whose background already contrasts with
     * the default ink (e.g. a dark hero). Do NOT enable on the default header.
     */
    invert?: boolean;
}) {
    const accent = onBand ? "bg-ps-key" : "bg-ps-accent";
    const accentBorder = onBand ? "border-l-ps-key" : "border-l-ps-accent";
    const ampersand = onBand ? "text-ps-key" : "text-ps-accent";
    const wordmark = invert ? "text-ps-ink-inverse" : "text-ps-ink";

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
