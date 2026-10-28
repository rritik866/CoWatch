"use client";

import { useEffect, useRef, useState } from "react";
import { Film01, Lock01, Maximize01, Minimize01, PauseCircle, Play, VideoRecorder } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { cx } from "@/utils/cx";
import { formatTime } from "@/utils/youtube";

const AVAILABLE_EMOJIS = ["❤️", "🔥", "😂", "👏", "🍿", "🚀", "🎉"];

export function PlaybackControls({
    playState,
    currentTime,
    duration,
    canControl,
    currentRole,
    syncStatus,
    isCinemaMode,
    isFullscreen,
    onToggleCinema,
    onToggleFullscreen,
    onPlay,
    onPause,
    onSeek,
    onChangeVideoClick,
    onSendReaction,
}) {
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubPercent, setScrubPercent] = useState(0);

    const scrubPercentRef = useRef(scrubPercent);
    const durationRef = useRef(duration);
    const onSeekRef = useRef(onSeek);

    useEffect(() => {
        scrubPercentRef.current = scrubPercent;
        durationRef.current = duration;
        onSeekRef.current = onSeek;
    });

    const isPlaying = playState === "PLAYING";
    const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
    const currentPercent = isScrubbing ? scrubPercent : progressPercent;
    const displayTime = isScrubbing ? (scrubPercent / 100) * duration : currentTime;

    useEffect(() => {
        if (!isScrubbing) return;

        const handleRelease = () => {
            setIsScrubbing(false);
            const targetTime = (scrubPercentRef.current / 100) * (durationRef.current || 0);
            if (onSeekRef.current) {
                onSeekRef.current(targetTime);
            }
        };

        window.addEventListener("mouseup", handleRelease);
        window.addEventListener("touchend", handleRelease);

        return () => {
            window.removeEventListener("mouseup", handleRelease);
            window.removeEventListener("touchend", handleRelease);
        };
    }, [isScrubbing]);

    const handleScrubberChange = (e) => {
        if (!canControl) return;
        const val = parseFloat(e.target.value);
        setScrubPercent(isNaN(val) ? 0 : val);
        if (!isScrubbing) {
            setIsScrubbing(true);
        }
    };

    const handleScrubberStart = () => {
        if (!canControl) return;
        setIsScrubbing(true);
        setScrubPercent(progressPercent);
    };

    const handleScrubberCommit = () => {
        if (!canControl || !isScrubbing) return;
        setIsScrubbing(false);
        const targetTime = (scrubPercent / 100) * (duration || 0);
        if (onSeek) {
            onSeek(targetTime);
        }
    };

    return (
        <div
            className={cx(
                "flex flex-col gap-3 rounded-xl border p-4 shadow-xs transition-colors",
                isFullscreen ? "border-white/10 bg-black/85 text-white shadow-2xl backdrop-blur-md" : "border-secondary bg-primary",
            )}
        >
            <div className="relative flex w-full items-center">
                <ProgressBar min={0} max={100} value={currentPercent || 0} className="h-2 w-full" />
                <input
                    type="range"
                    min={0}
                    max={100}
                    step={0.1}
                    value={currentPercent || 0}
                    disabled={!canControl}
                    onMouseDown={handleScrubberStart}
                    onTouchStart={handleScrubberStart}
                    onChange={handleScrubberChange}
                    onKeyDown={handleScrubberStart}
                    onKeyUp={handleScrubberCommit}
                    onBlur={handleScrubberCommit}
                    className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    {isPlaying ? (
                        <Button size="md" color="secondary" iconLeading={PauseCircle} isDisabled={!canControl} onClick={onPause}>
                            Pause
                        </Button>
                    ) : (
                        <Button size="md" color="primary" iconLeading={Play} isDisabled={!canControl} onClick={onPlay}>
                            Play
                        </Button>
                    )}

                    <Button size="md" color="secondary" iconLeading={VideoRecorder} isDisabled={!canControl} onClick={onChangeVideoClick}>
                        Change Video
                    </Button>

                    <div className="text-sm text-tertiary">
                        {formatTime(displayTime)} / {formatTime(duration || 0)}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="group relative inline-flex items-center">
                        <button
                            type="button"
                            onClick={() => onSendReaction && onSendReaction("❤️")}
                            className={cx(
                                "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium shadow-xs transition-colors",
                                isFullscreen
                                    ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
                                    : "border-secondary bg-primary text-secondary hover:bg-primary_hover hover:text-primary",
                            )}
                        >
                            <span className="text-base select-none">😍</span>
                            <span className="text-xs font-semibold">React</span>
                        </button>

                        <div className="absolute right-0 bottom-full z-30 mb-2 hidden items-center gap-1 rounded-xl border border-secondary bg-primary/95 p-1.5 shadow-xl backdrop-blur-md transition-all duration-150 ease-out group-hover:flex after:absolute after:top-full after:right-0 after:left-0 after:h-3 after:content-['']">
                            {AVAILABLE_EMOJIS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => onSendReaction && onSendReaction(emoji)}
                                    className="cursor-pointer rounded-lg p-1.5 text-lg transition-transform hover:scale-130 active:scale-95"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button
                        size="md"
                        color={isCinemaMode ? "primary" : "secondary"}
                        iconLeading={Film01}
                        onClick={onToggleCinema}
                        aria-label={isCinemaMode ? "Exit cinema mode" : "Cinema mode"}
                    />

                    <Button
                        size="md"
                        color={isFullscreen ? "primary" : "secondary"}
                        iconLeading={isFullscreen ? Minimize01 : Maximize01}
                        onClick={onToggleFullscreen}
                        aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    />

                    {!canControl && (
                        <Badge size="md" color="gray" type="modern" className="flex items-center gap-1">
                            <Lock01 className="size-3.5" />
                            Watch Only
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}
