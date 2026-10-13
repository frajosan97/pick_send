// src/components/pickandsend/FloatingWhatsApp.tsx
import { waHref } from "./shared";

export function FloatingWhatsApp({
    wa,
    typing,
}: {
    wa: string;
    typing: boolean;
}) {
    return (
        <a
            href={waHref(wa, "Hi Pick&Send")}
            target="_blank"
            rel="noopener"
            aria-label="Chat with us on WhatsApp"
            className={`fixed right-3.5 bottom-3.5 z-[6] flex h-10 items-center gap-1.5 rounded-full bg-ps-wa pr-[13px] pl-[11px] text-[.84rem] font-bold text-ps-onwa no-underline shadow-[0_3px_10px_rgba(0,0,0,.22)] transition motion-reduce:transition-none max-sm:h-[42px] max-sm:w-[42px] max-sm:justify-center max-sm:p-0 ${typing ? "pointer-events-none translate-y-3 opacity-0" : "opacity-90"}`}
        >
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-[18px] w-[18px] flex-none fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
            >
                <path d="M4 19.5 5.3 15A8 8 0 1 1 9 18.7z" />
            </svg>
            <span className="max-sm:hidden">Chat</span>
        </a>
    );
}
