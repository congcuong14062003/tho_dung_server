import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

export const initSocket = (server) => {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: "*",
        credentials: true,
      },
    });

    // Middleware kiểm tra token
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;

      if (!token) return next(new Error("Token missing"));

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (err) {
        next(new Error("Invalid token"));
      }
    });

    io.on("connection", (socket) => {
      const { id, role } = socket.user;

      console.log(`🔌 Socket connected: user ${id} (${role})`);

      if (role === "admin") {
        socket.join("admin_room");
      }

      socket.on("disconnect", () => {
        console.log(`❌ Socket disconnected: user ${id}`);
      });
    });
  }

  return io;
};

export const getIO = () => io;
