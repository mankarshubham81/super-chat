import { Server } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";

interface SocketServer extends HTTPServer {
  io?: Server;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const socket = res.socket as SocketWithIO;

  if (!socket.server.io) {
    console.log("Initializing Socket.io...");

    // Initialize the Socket.io server
    const io = new Server(socket.server, {
      path: "/api/socket",
      cors: {
        origin: ["https://super-chat-nrdp.onrender.com","https://chat-super.vercel.app", "http://localhost:3000"], // Adjust for production and development
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
    socket.server.io = io;

    // Socket.io event handlers
    io.on("connection", (socket) => {
      console.log("A user connected");

      socket.on("join-room", (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
      });

      socket.on("send-message", ({ room, message }) => {
        io.to(room).emit("receive-message", message);
      });

      socket.on("disconnect", () => {
        console.log("A user disconnected");
      });
    });
  } else {
    console.log("Socket.io is already running.");
  }

  res.end();
}
