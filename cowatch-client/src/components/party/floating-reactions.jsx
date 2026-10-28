"use client";

import { cx } from "@/utils/cx";

export function FloatingReactions({ reactions, className }) {
    if (!reactions || reactions.length === 0) return null;

    return (
        <div className={cx("pointer-events-none absolute inset-0 z-30 overflow-hidden", className)}>
            {reactions.map((r) => (
                <div
                    key={r.id}
                    style={{ left: `${r.x}%` }}
                    className="absolute bottom-14 flex animate-[riseAndFade_2.5s_ease-out_forwards] flex-col items-center"
                >
                    <span className="text-3xl select-none">{r.emoji}</span>
                    <span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white/80 select-none">{r.username}</span>
                </div>
            ))}
        </div>
    );
}
