import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

// userId -> Map<deviceId, socketId>
const userSockets = new Map();

export const initSocket = (server) => {
  if (!io) {
    io = new Server(server, {
      cors: { origin: "*", credentials: true },
    });

    // Middleware auth
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      const deviceId = socket.handshake.auth?.deviceId;
      if (!token) return next(new Error("Missing token"));
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        // Nếu không phải admin thì BẮT BUỘC phải có deviceId
        if (decoded.role !== "admin") {
          if (!deviceId) return next(new Error("Missing deviceId for user"));
          socket.deviceId = deviceId;
        }
        next();
      } catch (err) {
        next(new Error("Invalid token"));
      }
    });

    io.on("connection", (socket) => {
      const { id, role } = socket.user;
      const deviceId = socket.deviceId;

      console.log(`🔌 Socket connected: user ${id} - device ${deviceId}`);

      if (role === "admin") {
        socket.join("admin_room");
      } else {
        if (!userSockets.has(id)) userSockets.set(id, new Map());

        const devices = userSockets.get(id);

        // 🔥 Nếu thiết bị này đã có socket cũ → xóa nó
        if (devices.has(deviceId)) {
          const oldSocketId = devices.get(deviceId);
          io.sockets.sockets.get(oldSocketId)?.disconnect(true);
        }

        // 🔥 Gắn socket mới cho device
        devices.set(deviceId, socket.id);
      }

      // 🔌 Khi disconnect
      socket.on("disconnect", () => {
        console.log(`❌ Socket disconnected: user ${id}, device ${deviceId}`);

        if (role !== "admin") {
          const devices = userSockets.get(id);
          if (devices) {
            devices.delete(deviceId);
            if (devices.size === 0) userSockets.delete(id);
          }
        }
      });
    });
  }

  return io;
};

// Lấy tất cả socketId của user (đa thiết bị)
export const getUserSockets = (userId) => {
  const devices = userSockets.get(userId);
  return devices ? Array.from(devices.values()) : [];
};

export const getIO = () => io;
