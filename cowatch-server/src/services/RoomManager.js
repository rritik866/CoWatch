import { Room } from "../models/Room.js";
import { VideoState } from "../models/VideoState.js";

export class RoomManager {
    constructor(dbService) {
        this.rooms = new Map();
        this.dbService = dbService;
    }

    async createRoom(
        id,
        name,
        hostId,
        maxParticipants = 10,
        initialVideoId = ""
    ) {
        const videoState = new VideoState(initialVideoId, "PAUSED", 0, 1.0, Date.now());
        const room = new Room(id, name, hostId, maxParticipants, videoState);
        this.rooms.set(id, room);
        await this.dbService.upsertRoom(room);
        return room;
    }

    async getRoom(id) {
        if (this.rooms.has(id)) {
            return this.rooms.get(id);
        }

        const roomFromDb = await this.dbService.getRoom(id);
        if (roomFromDb) {
            this.rooms.set(id, roomFromDb);
            return roomFromDb;
        }

        return null;
    }

    async removeRoom(id) {
        return this.rooms.delete(id);
    }

    findRoomBySocketId(socketId) {
        for (const room of this.rooms.values()) {
            const participant = room.getParticipantBySocketId(socketId);
            if (participant) {
                return { room, userId: participant.userId };
            }
        }
        return null;
    }

    getAllRooms() {
        return Array.from(this.rooms.values());
    }
}

