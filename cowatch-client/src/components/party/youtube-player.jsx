"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { cx } from "@/utils/cx";

export function YouTubePlayer({ playerControlRef, videoState, canControl, isRemoteActionRef, onPlay, onPause, onSeek, onProgressUpdate, className }) {
    const playerRef = useRef(null);
    const containerRef = useRef(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const lastVideoIdRef = useRef("");
    const remoteTimeoutRef = useRef(null);

    const canControlRef = useRef(canControl);
    const videoStateRef = useRef(videoState);
    const onPlayRef = useRef(onPlay);
    const onPauseRef = useRef(onPause);
    const onSeekRef = useRef(onSeek);
    const onProgressUpdateRef = useRef(onProgressUpdate);

    useEffect(() => {
        canControlRef.current = canControl;
        videoStateRef.current = videoState;
        onPlayRef.current = onPlay;
        onPauseRef.current = onPause;
        onSeekRef.current = onSeek;
        onProgressUpdateRef.current = onProgressUpdate;
    });

    const markRemoteAction = useCallback(() => {
        if (isRemoteActionRef) {
            isRemoteActionRef.current = true;
        }
        if (remoteTimeoutRef.current) {
            clearTimeout(remoteTimeoutRef.current);
        }
        remoteTimeoutRef.current = setTimeout(() => {
            if (isRemoteActionRef) {
                isRemoteActionRef.current = false;
            }
        }, 1200);
    }, [isRemoteActionRef]);

    useEffect(() => {
        if (playerControlRef) {
            playerControlRef.current = {
                play: () => {
                    if (playerRef.current && playerRef.current.playVideo) {
                        markRemoteAction();
                        playerRef.current.playVideo();
                        if (onProgressUpdateRef.current && playerRef.current.getCurrentTime) {
                            onProgressUpdateRef.current(
                                playerRef.current.getCurrentTime(),
                                playerRef.current.getDuration ? playerRef.current.getDuration() : 0,
                            );
                        }
                    }
                },
                pause: () => {
                    if (playerRef.current && playerRef.current.pauseVideo) {
                        markRemoteAction();
                        playerRef.current.pauseVideo();
                        if (onProgressUpdateRef.current && playerRef.current.getCurrentTime) {
                            onProgressUpdateRef.current(
                                playerRef.current.getCurrentTime(),
                                playerRef.current.getDuration ? playerRef.current.getDuration() : 0,
                            );
                        }
                    }
                },
                seek: (time) => {
                    if (playerRef.current && playerRef.current.seekTo) {
                        markRemoteAction();
                        playerRef.current.seekTo(time, true);
                        if (onProgressUpdateRef.current) {
                            onProgressUpdateRef.current(time, playerRef.current.getDuration ? playerRef.current.getDuration() : 0);
                        }
                    }
                },
            };
        }
    }, [playerControlRef, markRemoteAction]);

    const getExpectedTime = useCallback(() => {
        const cur = videoStateRef.current;
        if (cur.playState === "PLAYING") {
            const elapsed = (Date.now() - cur.timestamp) / 1000;
            return Math.max(0, cur.currentTime + elapsed * cur.playbackRate);
        }
        return Math.max(0, cur.currentTime || 0);
    }, []);

    useEffect(() => {
        if (!videoState.videoId) return;

        let isCancelled = false;

        const initPlayer = () => {
            if (isCancelled || !containerRef.current || !window.YT || !window.YT.Player) return;
            if (playerRef.current) return;

            containerRef.current.innerHTML = "";
            const playerDiv = document.createElement("div");
            playerDiv.className = "size-full";
            containerRef.current.appendChild(playerDiv);

            playerRef.current = new window.YT.Player(playerDiv, {
                videoId: videoState.videoId,
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    rel: 0,
                    modestbranding: 1,
                    playsinline: 1,
                    enablejsapi: 1,
                },
                events: {
                    onReady: (event) => {
                        if (isCancelled) return;
                        setIsPlayerReady(true);
                        lastVideoIdRef.current = videoStateRef.current.videoId;
                        markRemoteAction();
                        const current = videoStateRef.current;
                        const expected = getExpectedTime();
                        if (current.playState === "PLAYING") {
                            event.target.seekTo(expected, true);
                            event.target.playVideo();
                        } else {
                            event.target.cueVideoById({
                                videoId: current.videoId,
                                startSeconds: expected,
                            });
                        }
                    },
                    onStateChange: (event) => {
                        if (isCancelled) return;
                        if (isRemoteActionRef && isRemoteActionRef.current) {
                            return;
                        }

                        const canCtrl = canControlRef.current;
                        const current = videoStateRef.current;

                        if (!canCtrl) {
                            markRemoteAction();
                            const expected = getExpectedTime();
                            if (current.playState === "PLAYING") {
                                event.target.seekTo(expected, true);
                                event.target.playVideo();
                            } else {
                                event.target.pauseVideo();
                            }
                            return;
                        }

                        if (event.data === window.YT.PlayerState.PLAYING) {
                            if (onProgressUpdateRef.current && event.target.getCurrentTime) {
                                onProgressUpdateRef.current(event.target.getCurrentTime(), event.target.getDuration ? event.target.getDuration() : 0);
                            }
                            if (current.playState !== "PLAYING" && onPlayRef.current) {
                                onPlayRef.current();
                            }
                        } else if (event.data === window.YT.PlayerState.PAUSED) {
                            if (onProgressUpdateRef.current && event.target.getCurrentTime) {
                                onProgressUpdateRef.current(event.target.getCurrentTime(), event.target.getDuration ? event.target.getDuration() : 0);
                            }
                            if (current.playState !== "PAUSED" && onPauseRef.current) {
                                onPauseRef.current();
                            }
                        } else if (event.data === window.YT.PlayerState.ENDED) {
                            if (onPauseRef.current) {
                                onPauseRef.current();
                            }
                        }
                    },
                },
            });
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
            if (!existingScript) {
                const tag = document.createElement("script");
                tag.src = "https://www.youtube.com/iframe_api";
                document.head.appendChild(tag);
            }
            const interval = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    clearInterval(interval);
                    initPlayer();
                }
            }, 100);

            return () => {
                isCancelled = true;
                clearInterval(interval);
                if (playerRef.current && playerRef.current.destroy) {
                    try {
                        playerRef.current.destroy();
                    } catch (e) {}
                    playerRef.current = null;
                }
                if (containerRef.current) {
                    containerRef.current.innerHTML = "";
                }
                setIsPlayerReady(false);
            };
        }

        return () => {
            isCancelled = true;
            if (playerRef.current && playerRef.current.destroy) {
                try {
                    playerRef.current.destroy();
                } catch (e) {}
                playerRef.current = null;
            }
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
            }
            setIsPlayerReady(false);
        };
    }, [videoState.videoId, getExpectedTime, markRemoteAction]);

    useEffect(() => {
        if (!isPlayerReady || !playerRef.current) return;

        if (videoState.videoId && videoState.videoId !== lastVideoIdRef.current) {
            lastVideoIdRef.current = videoState.videoId;
            markRemoteAction();
            const expected = getExpectedTime();
            if (videoState.playState === "PLAYING") {
                playerRef.current.loadVideoById({
                    videoId: videoState.videoId,
                    startSeconds: expected,
                });
            } else {
                playerRef.current.cueVideoById({
                    videoId: videoState.videoId,
                    startSeconds: expected,
                });
            }
            return;
        }

        const expected = getExpectedTime();
        const currentPos = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;
        const drift = Math.abs(currentPos - expected);

        if (drift > 1.5 && playerRef.current.seekTo) {
            markRemoteAction();
            playerRef.current.seekTo(expected, true);
        }

        const playerState = playerRef.current.getPlayerState ? playerRef.current.getPlayerState() : -1;
        if (videoState.playState === "PLAYING") {
            if (playerState !== 1 && playerState !== 3 && playerRef.current.playVideo) {
                markRemoteAction();
                playerRef.current.playVideo();
                if (onProgressUpdateRef.current && playerRef.current.getCurrentTime) {
                    onProgressUpdateRef.current(playerRef.current.getCurrentTime(), playerRef.current.getDuration ? playerRef.current.getDuration() : 0);
                }
            }
        } else if (videoState.playState === "PAUSED") {
            if (playerState === 1 && playerRef.current.pauseVideo) {
                markRemoteAction();
                playerRef.current.pauseVideo();
                if (onProgressUpdateRef.current && playerRef.current.getCurrentTime) {
                    onProgressUpdateRef.current(playerRef.current.getCurrentTime(), playerRef.current.getDuration ? playerRef.current.getDuration() : 0);
                }
            }
        }
    }, [videoState, isPlayerReady, getExpectedTime, markRemoteAction]);

    useEffect(() => {
        if (!isPlayerReady || !playerRef.current) return;

        const interval = setInterval(() => {
            if (!playerRef.current || !playerRef.current.getCurrentTime) return;
            const current = playerRef.current.getCurrentTime();
            const duration = playerRef.current.getDuration ? playerRef.current.getDuration() : 0;

            if (onProgressUpdateRef.current) {
                onProgressUpdateRef.current(current, duration);
            }

            if (videoStateRef.current.playState === "PLAYING") {
                const expected = getExpectedTime();
                const drift = Math.abs(current - expected);
                if (drift > 2.0 && playerRef.current.seekTo) {
                    markRemoteAction();
                    playerRef.current.seekTo(expected, true);
                }
            }
        }, 100);

        return () => clearInterval(interval);
    }, [isPlayerReady, getExpectedTime, markRemoteAction]);

    if (!videoState.videoId) {
        return (
            <div
                className={cx(
                    "relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-xl bg-black p-6 shadow-lg",
                    className,
                )}
            >
                <span className="text-sm font-medium text-tertiary">Loading video...</span>
                <div className="w-48">
                    <ProgressBar min={0} max={100} value={50} />
                </div>
            </div>
        );
    }

    return (
        <div className={cx("relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg", className)}>
            <div ref={containerRef} className="pointer-events-none size-full" />
            <div
                className="absolute inset-0 z-10 cursor-default bg-transparent select-none"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                }}
            />
        </div>
    );
}
