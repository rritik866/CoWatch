"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";

const DEFAULT_PERMISSIONS = {
    canControlPlayback: false,
    canManageRoles: false,
    canKickParticipants: false
};

const DEFAULT_VIDEO_STATE = {
    videoId: "",
    playState: "PAUSED",
    currentTime: 0,
    playbackRate: 1.0,
    timestamp: Date.now()
};

export function useWatchParty(roomId, username, userId, initialRoom) {
    const [connected, setConnected] = useState(false);
    const [roomDetails, setRoomDetails] = useState(() => initialRoom ? {
        roomId: initialRoom.roomId || roomId,
        name: initialRoom.name,
        hostId: initialRoom.hostId,
        maxParticipants: initialRoom.maxParticipants,
        currentParticipantsCount: initialRoom.currentParticipantsCount || 1
    } : null);
    const [currentRole, setCurrentRole] = useState("PARTICIPANT");
    const [permissions, setPermissions] = useState(DEFAULT_PERMISSIONS);
    const [participants, setParticipants] = useState(() => initialRoom?.participants || []);
    const [videoState, setVideoState] = useState(() => ({
        ...DEFAULT_VIDEO_STATE,
        videoId: initialRoom?.videoState?.videoId || "",
        playState: initialRoom?.videoState?.playState || "PAUSED",
        currentTime: initialRoom?.videoState?.currentTime || 0
    }));
    const [messages, setMessages] = useState([]);
    const [reactions, setReactions] = useState([]);
    const [errorMessage, setErrorMessage] = useState(null);
    const [syncStatus, setSyncStatus] = useState("disconnected");

    const socketRef = useRef(null);
    const isRemoteActionRef = useRef(false);

    useEffect(() => {
        if (initialRoom) {
            setRoomDetails(prev => prev || {
                roomId: initialRoom.roomId || roomId,
                name: initialRoom.name,
                hostId: initialRoom.hostId,
                maxParticipants: initialRoom.maxParticipants,
                currentParticipantsCount: initialRoom.currentParticipantsCount || 1
            });
            if (initialRoom.videoState?.videoId) {
                setVideoState(prev => prev.videoId ? prev : {
                    ...prev,
                    videoId: initialRoom.videoState.videoId,
                    playState: initialRoom.videoState.playState || "PAUSED",
                    currentTime: initialRoom.videoState.currentTime || 0
                });
            }
        }
    }, [initialRoom, roomId]);

    useEffect(() => {
        if (!roomId || !username) return;

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";
        const socket = io(socketUrl, {
            transports: ["websocket", "polling"],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });
        socketRef.current = socket;

        socket.on("connect", () => {
            setConnected(true);
            setSyncStatus("synced");
            setErrorMessage(null);
            socket.emit("join_room", {
                roomId,
                username,
                userId
            });
        });

        socket.on("disconnect", () => {
            setConnected(false);
            setSyncStatus("disconnected");
        });

        socket.on("sync_state", (data) => {
            isRemoteActionRef.current = true;
            setVideoState({
                videoId: data.videoId,
                playState: data.playState,
                currentTime: data.currentTime,
                playbackRate: data.playbackRate || 1.0,
                timestamp: data.timestamp || Date.now()
            });
            if (data.roomDetails) {
                setRoomDetails(data.roomDetails);
            }
            if (data.currentRole) {
                setCurrentRole(data.currentRole);
            }
            if (data.permissions) {
                setPermissions(data.permissions);
            }
            setSyncStatus("synced");
        });

        socket.on("play", (data) => {
            isRemoteActionRef.current = true;
            setVideoState(prev => ({
                ...prev,
                playState: "PLAYING",
                currentTime: data?.currentTime !== undefined ? data.currentTime : prev.currentTime,
                timestamp: data?.timestamp || Date.now()
            }));
        });

        socket.on("pause", (data) => {
            isRemoteActionRef.current = true;
            setVideoState(prev => ({
                ...prev,
                playState: "PAUSED",
                currentTime: data?.currentTime !== undefined ? data.currentTime : prev.currentTime,
                timestamp: data?.timestamp || Date.now()
            }));
        });

        socket.on("seek", (data) => {
            isRemoteActionRef.current = true;
            setVideoState(prev => ({
                ...prev,
                currentTime: data.time,
                timestamp: data?.timestamp || Date.now()
            }));
        });

        socket.on("change_video", (data) => {
            isRemoteActionRef.current = true;
            setVideoState(prev => ({
                ...prev,
                videoId: data.videoId,
                playState: "PAUSED",
                currentTime: 0,
                timestamp: Date.now()
            }));
        });

        socket.on("user_joined", (data) => {
            setParticipants(data.participants);
            setRoomDetails(prev => prev ? {
                ...prev,
                currentParticipantsCount: data.currentParticipantsCount,
                maxParticipants: data.maxParticipants
            } : null);
        });

        socket.on("user_left", (data) => {
            setParticipants(data.participants);
            setRoomDetails(prev => prev ? {
                ...prev,
                currentParticipantsCount: data.currentParticipantsCount,
                maxParticipants: data.maxParticipants
            } : null);
        });

        socket.on("role_assigned", (data) => {
            setParticipants(data.participants);
            if (data.userId === userId) {
                setCurrentRole(data.role);
                const updated = data.participants.find(p => p.userId === userId);
                if (updated) {
                    setPermissions(updated.permissions);
                }
            }
        });

        socket.on("permissions_updated", (data) => {
            setCurrentRole(data.role);
            setPermissions(data.permissions);
        });

        socket.on("participant_removed", (data) => {
            setParticipants(data.participants);
            setRoomDetails(prev => prev ? { ...prev, currentParticipantsCount: data.currentParticipantsCount } : null);
        });

        socket.on("chat_history", (data) => {
            setMessages(data.messages || []);
        });

        socket.on("new_message", (message) => {
            setMessages(prev => [...prev, message]);
        });

        socket.on("new_reaction", (reaction) => {
            const newReaction = {
                id: `${Date.now()}-${Math.random()}`,
                emoji: reaction.emoji,
                username: reaction.username,
                x: Math.floor(Math.random() * 80) + 10
            };
            setReactions(prev => [...prev, newReaction]);
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== newReaction.id));
            }, 3000);
        });

        socket.on("room_error", (data) => {
            setErrorMessage(data.message);
        });

        return () => {
            socket.emit("leave_room", { roomId, userId });
            socket.disconnect();
            socketRef.current = null;
        };
    }, [roomId, username, userId]);

    const sendPlay = useCallback((currentTime) => {
        if (socketRef.current && permissions.canControlPlayback) {
            setVideoState(prev => ({
                ...prev,
                playState: "PLAYING",
                currentTime: currentTime !== undefined ? currentTime : prev.currentTime,
                timestamp: Date.now()
            }));
            socketRef.current.emit("play", { roomId, currentTime });
        }
    }, [roomId, permissions.canControlPlayback]);

    const sendPause = useCallback((currentTime) => {
        if (socketRef.current && permissions.canControlPlayback) {
            setVideoState(prev => ({
                ...prev,
                playState: "PAUSED",
                currentTime: currentTime !== undefined ? currentTime : prev.currentTime,
                timestamp: Date.now()
            }));
            socketRef.current.emit("pause", { roomId, currentTime });
        }
    }, [roomId, permissions.canControlPlayback]);

    const sendSeek = useCallback((time) => {
        if (socketRef.current && permissions.canControlPlayback) {
            setVideoState(prev => ({
                ...prev,
                currentTime: time,
                timestamp: Date.now()
            }));
            socketRef.current.emit("seek", { roomId, time });
        }
    }, [roomId, permissions.canControlPlayback]);

    const sendChangeVideo = useCallback((newVideoId) => {
        if (socketRef.current && permissions.canControlPlayback) {
            socketRef.current.emit("change_video", { roomId, videoId: newVideoId });
        }
    }, [roomId, permissions.canControlPlayback]);

    const sendAssignRole = useCallback((targetUserId, role) => {
        if (socketRef.current && permissions.canManageRoles) {
            socketRef.current.emit("assign_role", { roomId, userId: targetUserId, role });
        }
    }, [roomId, permissions.canManageRoles]);

    const sendRemoveParticipant = useCallback((targetUserId) => {
        if (socketRef.current && permissions.canKickParticipants) {
            socketRef.current.emit("remove_participant", { roomId, userId: targetUserId });
        }
    }, [roomId, permissions.canKickParticipants]);

    const sendTransferHost = useCallback((targetUserId) => {
        if (socketRef.current && currentRole === "HOST") {
            socketRef.current.emit("transfer_host", { roomId, targetUserId });
        }
    }, [roomId, currentRole]);

    const sendMessage = useCallback((messageText) => {
        if (socketRef.current && messageText.trim()) {
            socketRef.current.emit("send_message", { roomId, message: messageText });
        }
    }, [roomId]);

    const sendReaction = useCallback((emoji) => {
        if (socketRef.current) {
            socketRef.current.emit("send_reaction", { roomId, emoji });
        }
    }, [roomId]);

    return {
        connected,
        roomDetails,
        currentRole,
        permissions,
        participants,
        videoState,
        messages,
        reactions,
        errorMessage,
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
    };
}
