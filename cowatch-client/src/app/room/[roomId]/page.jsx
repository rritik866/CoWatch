"use client";

import { use, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
    Copy01,
    Check,
    Users01,
    MessageSquare01,
    InfoCircle,
    LogOut01,
    Shield01,
    AlertCircle
} from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { YouTubePlayer } from "@/components/party/youtube-player";
import { PlaybackControls } from "@/components/party/playback-controls";
import { ParticipantsTab } from "@/components/party/participants-tab";
import { ChatTab } from "@/components/party/chat-tab";
import { FloatingReactions } from "@/components/party/floating-reactions";
import { ChangeVideoModal } from "@/components/party/change-video-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWatchParty } from "@/hooks/use-watch-party";
import { cx } from "@/utils/cx";

export default function RoomPage({ params }) {
    const { roomId } = use(params);
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [userId, setUserId] = useState("");
    const [isNamePromptOpen, setIsNamePromptOpen] = useState(false);
    const [tempName, setTempName] = useState("");
    const [isChangeVideoOpen, setIsChangeVideoOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("chat");
    const [copied, setCopied] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const [dbRoom, setDbRoom] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const fetchRoom = async () => {
            try {
                const serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";
                let res;
                try {
                    res = await fetch(`/api/rooms/${roomId}`);
                } catch (e) {
                    res = await fetch(`${serverUrl}/api/rooms/${roomId}`);
                }
                const data = await res.json();
                if (!active) return;
                if (!res.ok || !data.success) {
                    setFetchError(data.error || "Room not found");
                } else if (data.room) {
                    setDbRoom(data.room);
                }
            } catch (err) {
                if (active) {
                    setFetchError("Unable to load room details");
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        };
        fetchRoom();
        return () => {
            active = false;
        };
    }, [roomId]);

    useEffect(() => {
        let storedUid = sessionStorage.getItem("cowatch_uid");
        if (!storedUid) {
            storedUid = `usr_${Math.random().toString(36).substring(2, 9)}`;
            sessionStorage.setItem("cowatch_uid", storedUid);
        }
        setUserId(storedUid);

        let activeName = sessionStorage.getItem("cowatch_uname") || "";
        if (!activeName) {
            setIsNamePromptOpen(true);
        } else {
            setUsername(activeName);
        }
    }, []);

    const {
        connected,
        roomDetails,
        currentRole,
        permissions,
        participants,
        videoState,
        messages,
        reactions,
        errorMessage: socketError,
        syncStatus,
        isRemoteActionRef,
        sendPlay,
        sendPause,
        sendSeek,
        sendChangeVideo,
        sendAssignRole,
        sendRemoveParticipant,
        sendTransferHost,
        sendMessage,
        sendReaction
    } = useWatchParty(
        roomId,
        username,
        userId,
        dbRoom
    );

    const errorMessage = fetchError || socketError;

    const handleCopyInvite = () => {
        const url = window.location.origin + `/room/${roomId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleNameSubmit = (e) => {
        e.preventDefault();
        if (tempName.trim()) {
            const trimmed = tempName.trim();
            setUsername(trimmed);
            sessionStorage.setItem("cowatch_uname", trimmed);
            setIsNamePromptOpen(false);
        }
    };

    const handleLeave = () => {
        router.push("/");
    };

    const stageRef = useRef(null);
    const playerControlRef = useRef(null);
    const [isCinemaMode, setIsCinemaMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
        };
    }, []);

    const handleToggleCinema = () => {
        setIsCinemaMode(prev => !prev);
    };

    const handleToggleFullscreen = () => {
        if (!stageRef.current) return;

        const isFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        if (!isFs) {
            if (stageRef.current.requestFullscreen) {
                stageRef.current.requestFullscreen().catch(() => {});
            } else if (stageRef.current.webkitRequestFullscreen) {
                stageRef.current.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    };

    const handleChangeVideoClick = () => {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
        setIsChangeVideoOpen(true);
    };

    const handlePlay = () => {
        if (playerControlRef.current) {
            playerControlRef.current.play();
        }
        sendPlay(currentTime);
    };

    const handlePause = () => {
        if (playerControlRef.current) {
            playerControlRef.current.pause();
        }
        sendPause(currentTime);
    };

    const handleSeek = (time) => {
        setCurrentTime(time);
        if (playerControlRef.current) {
            playerControlRef.current.seek(time);
        }
        sendSeek(time);
    };

    if (isNamePromptOpen) {
        return (
            <div className="flex h-screen items-center justify-center bg-primary p-4">
                <div className="w-full max-w-sm rounded-2xl border border-secondary bg-primary p-6 shadow-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <h2 className="text-lg font-semibold text-primary">Enter your name</h2>
                    </div>
                    <p className="text-sm text-tertiary mb-4">
                        Choose a display name to join the watch party in room <span className="font-semibold text-primary">{roomId}</span>.
                    </p>
                    <form onSubmit={handleNameSubmit} className="flex flex-col gap-3">
                        <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full rounded-lg border border-primary bg-primary px-3.5 py-2 text-sm text-primary placeholder-placeholder outline-none focus:border-brand-solid"
                            autoFocus
                        />
                        <Button size="md" color="primary" type="submit" isDisabled={!tempName.trim()}>
                            Join Watch Party
                        </Button>
                    </form>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-primary p-4">
                <div className="flex w-full max-w-xs flex-col items-center gap-4">
                    <Image src="/logo.svg" alt="Logo" width={30} height={30} />
                    <span className="text-sm font-medium text-tertiary">Loading watch party...</span>
                    <ProgressBar min={0} max={100} value={60} className="w-full" />
                </div>
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="flex h-screen items-center justify-center bg-primary p-4">
                <div className="w-full max-w-md rounded-2xl border border-secondary bg-primary p-6 shadow-xl text-center">
                    <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-utility-red-50 text-utility-red-600 mb-4">
                        <AlertCircle className="size-6" />
                    </div>
                    <h2 className="text-lg font-semibold text-primary mb-2">Unable to Join Room</h2>
                    <p className="text-sm text-tertiary mb-6">{errorMessage}</p>
                    <Button size="md" color="primary" onClick={handleLeave}>
                        Back to Home
                    </Button>
                </div>
            </div>
        );
    }

    const isHost = currentRole === "HOST";
    const canControl = permissions.canControlPlayback;
    const maxParticipants = roomDetails?.maxParticipants || dbRoom?.maxParticipants || 10;

    return (
        <div className="flex h-screen flex-col bg-secondary/30">
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-secondary bg-primary px-4 md:px-6">
                <div className="flex items-center gap-3">
                    <Image src="/logo.svg" alt="Logo" width={30} height={30} />
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-primary">
                            {roomDetails?.name || dbRoom?.name || `Party ${roomId}`}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-tertiary">Code: {roomId}</span>
                            <button
                                type="button"
                                onClick={handleCopyInvite}
                                className="flex items-center gap-1 text-xs text-brand-primary hover:underline"
                            >
                                {copied ? <Check className="size-3" /> : <Copy01 className="size-3" />}
                                {copied ? "Copied" : "Copy Link"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Badge size="md" color="slate" type="pill-color" className="hidden sm:flex">
                        {participants.length} / {maxParticipants} Members
                    </Badge>

                    {isHost ? (
                        <Badge size="md" color="brand" type="color">
                            Host
                        </Badge>
                    ) : currentRole === "MODERATOR" ? (
                        <Badge size="md" color="blue" type="color">
                            Moderator
                        </Badge>
                    ) : (
                        <Badge size="md" color="gray" type="color">
                            Participant
                        </Badge>
                    )}

                    <ThemeToggle size="sm" />

                    <Button size="sm" color="secondary" iconLeading={LogOut01} onClick={handleLeave}>
                        
                    </Button>
                </div>
            </header>

            <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
                <div
                    ref={stageRef}
                    className={cx(
                        "flex flex-1 flex-col transition-all duration-200",
                        isFullscreen
                            ? "fixed inset-0 z-50 h-screen w-screen bg-black p-4 md:p-6 justify-between overflow-hidden"
                            : "overflow-y-auto p-4 md:p-6 gap-4"
                    )}
                >
                    <div className={cx(
                        "relative flex flex-1 items-center justify-center w-full min-h-0",
                        isFullscreen ? "overflow-hidden" : ""
                    )}>
                        <div className={cx(
                            "relative aspect-video overflow-hidden bg-black shadow-lg transition-all duration-200",
                            isFullscreen
                                ? "h-full max-h-full max-w-full rounded-xl"
                                : isCinemaMode
                                    ? "w-full max-h-[calc(100vh-14rem)] rounded-xl mx-auto"
                                    : "w-full rounded-xl"
                        )}>
                            <YouTubePlayer
                                playerControlRef={playerControlRef}
                                videoState={videoState}
                                canControl={canControl}
                                isRemoteActionRef={isRemoteActionRef}
                                onPlay={sendPlay}
                                onPause={sendPause}
                                onSeek={sendSeek}
                                onProgressUpdate={(curr, dur) => {
                                    setCurrentTime(curr);
                                    setDuration(dur);
                                }}
                            />

                            <FloatingReactions reactions={reactions} />
                        </div>
                    </div>

                    <div className={cx(
                        "shrink-0 transition-all duration-200",
                        isFullscreen ? "w-full max-w-5xl mx-auto z-40" : "w-full"
                    )}>
                        <PlaybackControls
                            playState={videoState.playState}
                            currentTime={currentTime}
                            duration={duration}
                            canControl={canControl}
                            currentRole={currentRole}
                            syncStatus={syncStatus}
                            isCinemaMode={isCinemaMode}
                            isFullscreen={isFullscreen}
                            onToggleCinema={handleToggleCinema}
                            onToggleFullscreen={handleToggleFullscreen}
                            onPlay={handlePlay}
                            onPause={handlePause}
                            onSeek={handleSeek}
                            onChangeVideoClick={handleChangeVideoClick}
                            onSendReaction={sendReaction}
                        />
                    </div>
                </div>

                {!isCinemaMode && !isFullscreen && (
                    <aside className="flex w-full flex-col border-t lg:border-t-0 lg:border-l border-secondary bg-primary lg:w-96">
                    <div className="flex border-b border-secondary">
                        <button
                            type="button"
                            onClick={() => setActiveTab("chat")}
                            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
                                activeTab === "chat"
                                    ? "border-brand-solid text-brand-secondary"
                                    : "border-transparent text-tertiary hover:text-primary"
                            }`}
                        >
                            <MessageSquare01 className="size-4" />
                            Chat
                            {messages.length > 0 && (
                                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary">
                                    {messages.length}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("members")}
                            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
                                activeTab === "members"
                                    ? "border-brand-solid text-brand-secondary"
                                    : "border-transparent text-tertiary hover:text-primary"
                            }`}
                        >
                            <Users01 className="size-4" />
                            Members
                            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-secondary">
                                {participants.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab("info")}
                            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
                                activeTab === "info"
                                    ? "border-brand-solid text-brand-secondary"
                                    : "border-transparent text-tertiary hover:text-primary"
                            }`}
                        >
                            <InfoCircle className="size-4" />
                            Details
                        </button>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                        {activeTab === "chat" && (
                            <ChatTab
                                messages={messages}
                                currentUserId={userId}
                                onSendMessage={sendMessage}
                            />
                        )}

                        {activeTab === "members" && (
                            <div className="flex-1 p-4 overflow-y-auto">
                                <ParticipantsTab
                                    participants={participants}
                                    currentUserId={userId}
                                    isHost={isHost}
                                    maxParticipants={maxParticipants}
                                    onAssignRole={sendAssignRole}
                                    onRemoveParticipant={sendRemoveParticipant}
                                    onTransferHost={sendTransferHost}
                                />
                            </div>
                        )}

                        {activeTab === "info" && (
                            <div className="flex-1 p-4 overflow-y-auto">
                            <div className="space-y-4 text-sm text-secondary">
                                <div className="rounded-lg border border-secondary p-3 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-tertiary">Room Code:</span>
                                        <span className="font-medium text-primary">{roomId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tertiary">Max Capacity:</span>
                                        <span className="font-medium text-primary">{maxParticipants} Members</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tertiary">Current Video ID:</span>
                                        <span className="text-xs text-primary">{videoState.videoId}</span>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-secondary p-3 space-y-2">
                                    <h4 className="font-semibold text-primary flex items-center gap-1.5">
                                        <Shield01 className="size-4 text-brand-primary" />
                                        Role Permissions
                                    </h4>
                                    <ul className="space-y-1 text-xs text-tertiary list-disc pl-4">
                                        <li><strong>Host:</strong> Play/pause, seek, change video, assign roles, remove participants, transfer host.</li>
                                        <li><strong>Moderator:</strong> Play/pause, seek, change video.</li>
                                        <li><strong>Participant:</strong> Watch only, chat, send emoji reactions.</li>
                                    </ul>
                                </div>
                            </div>
                            </div>
                        )}
                    </div>
                </aside>
                )}
            </main>

            <ChangeVideoModal
                isOpen={isChangeVideoOpen}
                onClose={() => setIsChangeVideoOpen(false)}
                onSubmit={sendChangeVideo}
            />
        </div>
    );
}

