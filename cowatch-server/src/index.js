import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { DatabaseService } from "./db/DatabaseService.js";
import { RoomManager } from "./services/RoomManager.js";
import { WebSocketService } from "./services/WebSocketService.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
}));
app.use(express.json());

const io = new SocketIOServer(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const dbService = new DatabaseService();
const roomManager = new RoomManager(dbService);
new WebSocketService(io, roomManager, dbService);

app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/api/rooms", async (req, res) => {
    try {
        const rooms = await dbService.listRecentRooms(20);
        res.json({ success: true, rooms });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post("/api/rooms", async (req, res) => {
    try {
        const { roomId, name, hostId, maxParticipants, initialVideoId } = req.body;
        if (!roomId || !name || !hostId) {
            return res.status(400).json({ success: false, error: "Missing required fields" });
        }
        const room = await roomManager.createRoom(
            roomId,
            name,
            hostId,
            maxParticipants ? parseInt(maxParticipants, 10) : 10,
            initialVideoId || ""
        );
        res.json({ success: true, room: room.getState() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get("/api/rooms/:id", async (req, res) => {
    try {
        const room = await roomManager.getRoom(req.params.id);
        if (!room) {
            return res.status(404).json({ success: false, error: "Room not found" });
        }
        res.json({ success: true, room: room.getState() });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

async function bootstrap() {
    await dbService.initialize();
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

bootstrap().catch(err => {
    console.error("Server failed to start:", err);
    process.exit(1);
});

