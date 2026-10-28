export class Participant {
    constructor(userId, username, role, socketId, permissions, joinedAt) {
        this.userId = userId;
        this.username = username;
        this.role = role;
        this.socketId = socketId;
        this.permissions = permissions;
        this.joinedAt = joinedAt || new Date().toISOString();
    }

    canControlPlayback() {
        return Boolean(this.permissions?.canControlPlayback);
    }

    canManageRoles() {
        return Boolean(this.permissions?.canManageRoles);
    }

    canKickParticipants() {
        return Boolean(this.permissions?.canKickParticipants);
    }

    isHost() {
        return this.role === "HOST";
    }

    updateRole(newRole, newPermissions) {
        this.role = newRole;
        this.permissions = newPermissions;
    }

    updateSocketId(newSocketId) {
        this.socketId = newSocketId;
    }

    toJSON() {
        return {
            userId: this.userId,
            username: this.username,
            role: this.role,
            socketId: this.socketId,
            joinedAt: this.joinedAt,
            permissions: { ...this.permissions }
        };
    }
}

