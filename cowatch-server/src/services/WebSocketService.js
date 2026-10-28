import { Participant } from "../models/Participant.js";

export class WebSocketService {
    constructor(io, roomManager, dbService) {
        this.io = io;
        this.roomManager = roomManager;
        this.dbService = dbService;
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.io.on("connection", (socket) => {
            socket.on("join_room", async (data) => {
                await this.handleJoinRoom(socket, data);
            });

            socket.on("leave_room", async (data) => {
                await this.handleLeaveRoom(socket, data.roomId, data.userId);
            });

            socket.on("play", async (data) => {
                await this.handlePlay(socket, data.roomId, data.currentTime);
            });

            socket.on("pause", async (data) => {
                await this.handlePause(socket, data.roomId, data.currentTime);
            });

            socket.on("seek", async (data) => {
                await this.handleSeek(socket, data.roomId, data.time);
            });

            socket.on("change_video", async (data) => {
                await this.handleChangeVideo(socket, data.roomId, data.videoId);
            });

            socket.on("assign_role", async (data) => {
                await this.handleAssignRole(socket, data.roomId, data.userId, data.role);
            });

            socket.on("remove_participant", async (data) => {
                await this.handleRemoveParticipant(socket, data.roomId, data.userId);
            });

            socket.on("transfer_host", async (data) => {
                await this.handleTransferHost(socket, data.roomId, data.targetUserId);
            });

            socket.on("send_message", async (data) => {
                await this.handleSendMessage(socket, data.roomId, data.message);
            });

            socket.on("send_reaction", (data) => {
                this.handleSendReaction(socket, data.roomId, data.emoji);
            });

            socket.on("disconnect", async () => {
                await this.handleDisconnect(socket);
            });
        });
    }

    async handleJoinRoom(socket, data) {
        const { roomId, username } = data;
        if (!roomId || !username) {
            socket.emit("room_error", { message: "Invalid roomId or username" });
            return;
        }

        const userId = data.userId || socket.id;
        const initialVideoId = data.videoId || data.initialVideoId || "";
        let room = await this.roomManager.getRoom(roomId);

        if (!room) {
            socket.emit("room_error", {
                code: "ROOM_NOT_FOUND",
                message: "Room not found. Please check your room code or create a new watch party."
            });
            return;
        }

        if (initialVideoId && !room.videoState.videoId) {
            room.videoState.videoId = initialVideoId;
            await this.dbService.updateRoomVideoState(roomId, room.videoState);
        }

        const isRoomCreatorOrHost = room.hostId === userId || room.participants.size === 0;
        const initialRole = isRoomCreatorOrHost ? "HOST" : "PARTICIPANT";

        if (isRoomCreatorOrHost && room.hostId !== userId) {
            room.hostId = userId;
            await this.dbService.updateRoomHost(roomId, userId);
        }

        const permissions = this.dbService.getPermissionsForRole(initialRole);
        const participant = new Participant(userId, username, initialRole, socket.id, permissions);

        const addResult = room.addParticipant(participant);
        if (!addResult.success) {
            socket.emit("room_error", {
                code: "ROOM_CAPACITY_REACHED",
                message: addResult.reason || "Room capacity reached"
            });
            return;
        }

        socket.join(roomId);
        await this.dbService.recordParticipantJoin(roomId, userId, username, initialRole);

        const participantsList = room.getParticipantsList();

        socket.emit("sync_state", {
            ...room.videoState.toJSON(),
            roomDetails: {
                roomId: room.id,
                name: room.name,
                hostId: room.hostId,
                maxParticipants: room.maxParticipants,
                currentParticipantsCount: room.participants.size
            },
            currentRole: initialRole,
            permissions
        });

        this.io.to(roomId).emit("user_joined", {
            username,
            userId,
            role: initialRole,
            participants: participantsList,
            currentParticipantsCount: room.participants.size,
            maxParticipants: room.maxParticipants
        });

        const chatHistory = await this.dbService.getRecentMessages(roomId);
        socket.emit("chat_history", { messages: chatHistory });
    }

    async handleLeaveRoom(socket, roomId, userId) {
        const room = await this.roomManager.getRoom(roomId);
        if (!room) return;

        const participant = room.removeParticipant(userId);
        if (participant) {
            socket.leave(roomId);
            await this.dbService.recordParticipantLeave(roomId, userId);

            if (room.hostId === userId && room.participants.size > 0) {
                const nextHost = Array.from(room.participants.values())[0];
                const hostPermissions = this.dbService.getPermissionsForRole("HOST");
                const prevPermissions = this.dbService.getPermissionsForRole("MODERATOR");
                room.transferHost(nextHost.userId, hostPermissions, prevPermissions);
                await this.dbService.updateRoomHost(roomId, nextHost.userId);
                await this.dbService.recordParticipantRoleChange(roomId, nextHost.userId, "HOST");

                this.io.to(roomId).emit("role_assigned", {
                    userId: nextHost.userId,
                    username: nextHost.username,
                    role: "HOST",
                    participants: room.getParticipantsList()
                });
            }

            this.io.to(roomId).emit("user_left", {
                username: participant.username,
                userId,
                participants: room.getParticipantsList(),
                currentParticipantsCount: room.participants.size,
                maxParticipants: room.maxParticipants
            });
        }
    }

    async handlePlay(socket, roomId, currentTime) {
        const room = await this.roomManager.getRoom(roomId);
        if (!room) return;

        const participant = room.getParticipantBySocketId(socket.id);
        if (!participant || !participant.canControlPlayback()) {
            socket.emit("room_error", {
                code: "PERMISSION_DENIED",
                message: "Playback control is restricted to Host and Moderator"
            });
            return;
        }

        if (currentTime !== undefined && typeof currentTime === "number") {
            room.videoState.seek(currentTime);
        }
        room.videoState.play();
        await this.dbService.updateRoomVideoState(roomId, room.videoState);

        this.io.to(roomId).emit("play", {
            currentTime: room.videoState.getCurrentPosition(),
            timestamp: room.videoState.lastUpdated
        });
        this.io.to(roomId).emit("sync_state", room.videoState.toJSON());
    }

    async handlePause(socket, roomId, currentTime) {
        const room = await this.roomManager.getRoom(roomId);
        if (!room) return;

        const participant = room.getParticipantBySocketId(socket.id);
        if (!participant || !participant.canControlPlayback()) {
            socket.emit("room_error", {
                code: "PERMISSION_DENIED",
                message: "Playback control is restricted to Host and Moderator"
            });
            return;
        }

        if (currentTime !== undefined && typeof currentTime === "number") {
            room.videoState.seek(currentTime);
        }
        room.videoState.pause();
        await this.dbService.updateRoomVideoState(roomId, room.videoState);

        this.io.to(roomId).emit("pause", {
            currentTime: room.videoState.getCurrentPosition(),
            timestamp: room.videoState.lastUpdated
        });
        this.io.to(roomId).emit("sync_state", room.videoState.toJSON());
    }

    async handleSeek(socket, roomId, time) {
        const room = await this.roomManager.getRoom(roomId);
        if (!room) return;

        const participant = room.getParticipantBySocketId(socket.id);
        if (!participant || !participant.canControlPlayback()) {
            socket.emit("room_error", {
                code: "PERMISSION_DENIED",
                message: "Seeking is restricted to Host and Moderator"
            });
            return;
        }

        room.videoState.seek(time);
        await this.dbService.updateRoomVideoState(roomId, room.videoState);

        this.io.to(roomId).emit("seek", {
            time,
            timestamp: room.videoState.lastUpdated
        });
        this.io.to(roomId).emit("sync_state", room.videoState.toJSON());
    }

    async handleChangeVideo(socket, roomId, videoId) {
        const room = await this.roomManager.getRoom(roomId);
        if (!room) return;

        const participant = room.getParticipantBySocketId(socket.id);
        if (!participant || !participant.canControlPlayback()) {
            socket.emit("room_error", {
                code: "PERMISSION_DENIED",
                message: "Changing video is restricted to Host and Moderator"
            });
            return;
        }

        room.videoState.changeVideo(videoId);
        await this.dbService.updateRoomVideoState(roomId, room.videoState);

        this.io.to(roomId).emit("change_video", { videoId });
        this.io.to(roomId).emit("sync_state", room.videoState.toJSON());
    }

    async handleAssignRole(socket, roomId, targetUserId, role) {
        const room = await this.roomManager.getRoom(roomId);
        if (!room) return;

        const caller = room.getParticipantBySocketId(socket.id);
        if (!caller || !caller.canManageRoles()) {
            socket.emit("room_error", {
                code: "PERMISSION_DENIED",
                message: "Only the Host can assign roles"
            });
            return;
        }

        const permissions = this.dbService.getPermissionsForRole(role);
        const success = room.assignRole(targetUserId, role, permissions);
        if (!success) {
            socket.emit("room_error", { message: "Target participant not found" });
            return;
        }

        const target = room.getParticipant(targetUserId);
        await this.dbService.recordParticipantRoleChange(roomId, targetUserId, role);

        this.io.to(roomId).emit("role_assigned", {
            userId: targetUserId,
            username: target?.username || "",
            role,
            participants: room.getParticipantsList()
        });

        if (target && target.socketId) {
            this.io.to(target.socketId).emit("permissions_updated", {
                role,
                permissions
            });
        }
    }

    async handleRemoveParticipant(socket, roomId, targetUserId) {
        const room = await this.roomManager.getRoom(roomId);
        if (!room) return;

        const caller = room.getParticipantBySocketId(socket.id);
        if (!caller || !caller.canKickParticipants()) {
            socket.emit("room_error", {
                code: "PERMISSION_DENIED",
                message: "Only the Host can remove participants"
            });
            return;
        }

        const removed = room.removeParticipant(targetUserId);
        if (removed) {
            await this.dbService.recordParticipantLeave(roomId, targetUserId);

            this.io.to(roomId).emit("participant_removed", {
                userId: targetUserId,
                participants: room.getParticipantsList(),
                currentParticipantsCount: room.participants.size,
                maxParticipants: room.maxParticipants
            });

            const targetSocket = this.io.sockets.sockets.get(removed.socketId);
            if (targetSocket) {
                targetSocket.emit("room_error", {
                    code: "KICKED_FROM_ROOM",
                    message: "You have been removed from the room by the host"
                });
                targetSocket.leave(roomId);
            }
        }
    }

    async handleTransferHost(socket, roomId, targetUserId) {
        const room = await this.roomManager.getRoom(roomId);
        if (!room) return;

        const caller = room.getParticipantBySocketId(socket.id);
        if (!caller || !caller.isHost()) {
            socket.emit("room_error", {
                code: "PERMISSION_DENIED",
                message: "Only the current Host can transfer host ownership"
            });
            return;
        }

        const hostPermissions = this.dbService.getPermissionsForRole("HOST");
        const modPermissions = this.dbService.getPermissionsForRole("MODERATOR");

        const success = room.transferHost(targetUserId, hostPermissions, modPermissions);
        if (!success) {
            socket.emit("room_error", { message: "Target participant not found" });
            return;
        }

        await this.dbService.updateRoomHost(roomId, targetUserId);
        await this.dbService.recordParticipantRoleChange(roomId, caller.userId, "MODERATOR");
        await this.dbService.recordParticipantRoleChange(roomId, targetUserId, "HOST");

        this.io.to(roomId).emit("role_assigned", {
            userId: targetUserId,
            role: "HOST",
            participants: room.getParticipantsList()
        });
    }

    async handleSendMessage(socket, roomId, message) {
        const room = await this.roomManager.getRoom(roomId);
        if (!room || !message || message.trim().length === 0) return;

        const participant = room.getParticipantBySocketId(socket.id);
        if (!participant) return;

        const chatMessage = await this.dbService.saveChatMessage(
            roomId,
            participant.userId,
            participant.username,
            participant.role,
            message.trim()
        );

        this.io.to(roomId).emit("new_message", chatMessage);
    }

    handleSendReaction(socket, roomId, emoji) {
        const room = this.roomManager.findRoomBySocketId(socket.id)?.room;
        const participant = room?.getParticipantBySocketId(socket.id);
        if (!participant) return;

        this.io.to(roomId).emit("new_reaction", {
            roomId,
            userId: participant.userId,
            username: participant.username,
            emoji
        });
    }

    async handleDisconnect(socket) {
        const found = this.roomManager.findRoomBySocketId(socket.id);
        if (found) {
            await this.handleLeaveRoom(socket, found.room.id, found.userId);
        }
    }
}

