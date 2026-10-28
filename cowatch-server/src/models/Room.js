import { VideoState } from "./VideoState.js";

export class Room {
    constructor(
        id,
        name,
        hostId,
        maxParticipants = 10,
        videoState = null,
        createdAt = null
    ) {
        this.id = id;
        this.name = name;
        this.hostId = hostId;
        this.maxParticipants = Number(maxParticipants) || 10;
        this.videoState = videoState || new VideoState();
        this.participants = new Map();
        this.createdAt = createdAt || new Date().toISOString();
    }

    isFull() {
        return this.participants.size >= this.maxParticipants;
    }

    getActiveCount() {
        return this.participants.size;
    }

    addParticipant(participant) {
        if (this.participants.has(participant.userId)) {
            const existing = this.participants.get(participant.userId);
            existing.updateSocketId(participant.socketId);
            existing.username = participant.username;
            return { success: true };
        }

        if (this.isFull()) {
            return {
                success: false,
                reason: `Room has reached maximum capacity of ${this.maxParticipants} participants`
            };
        }

        this.participants.set(participant.userId, participant);
        return { success: true };
    }

    removeParticipant(userId) {
        const participant = this.participants.get(userId);
        if (participant) {
            this.participants.delete(userId);
        }
        return participant;
    }

    getParticipant(userId) {
        return this.participants.get(userId);
    }

    getParticipantBySocketId(socketId) {
        for (const participant of this.participants.values()) {
            if (participant.socketId === socketId) {
                return participant;
            }
        }
        return null;
    }

    assignRole(userId, newRole, permissions) {
        const participant = this.participants.get(userId);
        if (!participant) {
            return false;
        }
        participant.updateRole(newRole, permissions);
        return true;
    }

    transferHost(targetUserId, hostPermissions, previousHostPermissions) {
        const target = this.participants.get(targetUserId);
        const currentHost = this.participants.get(this.hostId);
        if (!target) {
            return false;
        }

        if (currentHost) {
            currentHost.updateRole("MODERATOR", previousHostPermissions);
        }

        target.updateRole("HOST", hostPermissions);
        this.hostId = target.userId;
        return true;
    }

    getParticipantsList() {
        return Array.from(this.participants.values()).map(p => p.toJSON());
    }

    getState() {
        return {
            roomId: this.id,
            name: this.name,
            hostId: this.hostId,
            maxParticipants: this.maxParticipants,
            currentParticipantsCount: this.participants.size,
            videoState: this.videoState.toJSON(),
            participants: this.getParticipantsList()
        };
    }
}

