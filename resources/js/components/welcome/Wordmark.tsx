// src/components/pickandsend/Wordmark.tsx
export function Wordmark({
    onBand = false,
    size = "text-[1.35rem]",
}: {
    onBand?: boolean;
    size?: string;
}) {
    const c = onBand ? "bg-ps-key" : "bg-ps-accent";
    return (
        <span className="inline-flex flex-col gap-[3px]">
            <span
                className={`${size} leading-none font-extrabold tracking-[-.03em] ${onBand ? "text-white" : "text-ps-brandink"}`}
            >
                Pick
                <i
                    className={`not-italic ${onBand ? "text-ps-key" : "text-ps-accent"}`}
                >
                    &amp;
                </i>
                Send
            </span>
            <span className="flex h-2.5 items-center" aria-hidden="true">
                <span
                    className={`h-[9px] w-[9px] flex-none rounded-full ${c}`}
                />
                <span className={`h-[3.5px] flex-1 ${c}`} />
                <span
                    className={`h-0 w-0 flex-none border-y-[5px] border-l-[9px] border-y-transparent ${onBand ? "border-l-ps-key" : "border-l-ps-accent"}`}
                />
            </span>
        </span>
    );
}
