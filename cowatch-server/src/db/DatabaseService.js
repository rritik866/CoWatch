import { pool } from "./pool.js";
import { Room } from "../models/Room.js";
import { VideoState } from "../models/VideoState.js";

export class DatabaseService {
    constructor() {
        this.roleCache = new Map();
    }

    async initialize() {
        try {
            const res = await pool.query("SELECT id, code, can_control_playback, can_manage_roles, can_kick_participants FROM roles;");
            for (const row of res.rows) {
                this.roleCache.set(row.code, {
                    id: row.id,
                    permissions: {
                        canControlPlayback: Boolean(row.can_control_playback),
                        canManageRoles: Boolean(row.can_manage_roles),
                        canKickParticipants: Boolean(row.can_kick_participants)
                    }
                });
            }
        } catch (error) {
            console.error("Failed to load roles from database:", error);
        }
    }

    getPermissionsForRole(roleCode) {
        const cached = this.roleCache.get(roleCode);
        if (cached) {
            return cached.permissions;
        }
        return {
            canControlPlayback: roleCode === "HOST" || roleCode === "MODERATOR",
            canManageRoles: roleCode === "HOST",
            canKickParticipants: roleCode === "HOST"
        };
    }

    getRoleId(roleCode) {
        const cached = this.roleCache.get(roleCode);
        return cached ? cached.id : null;
    }

    async upsertRoom(room) {
        const query = `
            INSERT INTO rooms (id, name, host_id, video_id, play_state, playback_position, playback_rate, max_participants, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                host_id = EXCLUDED.host_id,
                video_id = EXCLUDED.video_id,
                play_state = EXCLUDED.play_state,
                playback_position = EXCLUDED.playback_position,
                playback_rate = EXCLUDED.playback_rate,
                max_participants = EXCLUDED.max_participants,
                updated_at = CURRENT_TIMESTAMP;
        `;
        await pool.query(query, [
            room.id,
            room.name,
            room.hostId,
            room.videoState.videoId,
            room.videoState.playState,
            room.videoState.playbackPosition,
            room.videoState.playbackRate,
            room.maxParticipants
        ]);
    }

    async getRoom(roomId) {
        const res = await pool.query("SELECT * FROM rooms WHERE id = $1 LIMIT 1;", [roomId]);
        if (res.rows.length === 0) {
            return null;
        }
        const row = res.rows[0];
        const videoState = new VideoState(
            row.video_id,
            row.play_state,
            parseFloat(row.playback_position),
            parseFloat(row.playback_rate),
            new Date(row.updated_at).getTime()
        );
        return new Room(
            row.id,
            row.name,
            row.host_id,
            parseInt(row.max_participants, 10),
            videoState,
            new Date(row.created_at).toISOString()
        );
    }

    async updateRoomVideoState(roomId, videoState) {
        const query = `
            UPDATE rooms 
            SET video_id = $2, play_state = $3, playback_position = $4, playback_rate = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1;
        `;
        await pool.query(query, [
            roomId,
            videoState.videoId,
            videoState.playState,
            videoState.playbackPosition,
            videoState.playbackRate
        ]);
    }

    async updateRoomHost(roomId, newHostId) {
        await pool.query("UPDATE rooms SET host_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1;", [roomId, newHostId]);
    }

    async recordParticipantJoin(roomId, userId, username, roleCode) {
        const roleId = this.getRoleId(roleCode);
        const query = `
            INSERT INTO room_participants (room_id, user_id, username, role_id, is_active, joined_at)
            VALUES ($1, $2, $3, $4, TRUE, CURRENT_TIMESTAMP);
        `;
        await pool.query(query, [roomId, userId, username, roleId]);
    }

    async recordParticipantLeave(roomId, userId) {
        const query = `
            UPDATE room_participants
            SET is_active = FALSE, left_at = CURRENT_TIMESTAMP
            WHERE room_id = $1 AND user_id = $2 AND is_active = TRUE;
        `;
        await pool.query(query, [roomId, userId]);
    }

    async recordParticipantRoleChange(roomId, userId, roleCode) {
        const roleId = this.getRoleId(roleCode);
        const query = `
            UPDATE room_participants
            SET role_id = $3
            WHERE room_id = $1 AND user_id = $2 AND is_active = TRUE;
        `;
        await pool.query(query, [roomId, userId, roleId]);
    }

    async saveChatMessage(roomId, userId, username, roleCode, message) {
        const roleId = this.getRoleId(roleCode);
        const query = `
            INSERT INTO chat_messages (room_id, user_id, username, role_id, message, created_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            RETURNING id, created_at;
        `;
        const res = await pool.query(query, [roomId, userId, username, roleId, message]);
        const row = res.rows[0];
        return {
            id: row.id,
            roomId,
            userId,
            username,
            role: roleCode,
            message,
            createdAt: new Date(row.created_at).toISOString()
        };
    }

    async getRecentMessages(roomId, limit = 50) {
        const query = `
            SELECT m.id, m.room_id, m.user_id, m.username, r.code as role, m.message, m.created_at
            FROM chat_messages m
            LEFT JOIN roles r ON m.role_id = r.id
            WHERE m.room_id = $1
            ORDER BY m.created_at ASC
            LIMIT $2;
        `;
        const res = await pool.query(query, [roomId, limit]);
        return res.rows.map(row => ({
            id: row.id,
            roomId: row.room_id,
            userId: row.user_id,
            username: row.username,
            role: row.role || "PARTICIPANT",
            message: row.message,
            createdAt: new Date(row.created_at).toISOString()
        }));
    }

    async listRecentRooms(limit = 20) {
        const query = `
            SELECT r.id, r.name, r.host_id, r.video_id, r.play_state, r.playback_position, r.max_participants, r.created_at,
                   COUNT(p.id) FILTER (WHERE p.is_active = TRUE) as active_participants
            FROM rooms r
            LEFT JOIN room_participants p ON r.id = p.room_id
            GROUP BY r.id
            ORDER BY r.created_at DESC
            LIMIT $1;
        `;
        const res = await pool.query(query, [limit]);
        return res.rows;
    }
}

