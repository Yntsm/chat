import express from "express";
import http from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import path from "path";
import { connectDB } from "./db.ts";
import jwt from "jsonwebtoken";

import authRoutes from "./routes/auth.ts";
import userRoutes from "./routes/users.ts";
import messageRoutes from "./routes/messages.ts";

import { Message } from "./models/Message.ts";
import { Conversation } from "./models/Conversation.ts";
import { User } from "./models/User.ts";

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Connect Database
  await connectDB();

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/messages", messageRoutes);

  // Http Server & Socket.IO
  const server = http.createServer(app);
  const io = new SocketServer(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const onlineUsers = new Map<string, string>(); // userId -> socketId

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as any;
      socket.data.userId = decoded.userId;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    onlineUsers.set(userId, socket.id);
    console.log(`User connected: ${userId} (${socket.id})`);

    // Update real user online status
    if (process.env.MONGODB_URI) {
       await User.findByIdAndUpdate(userId, { onlineStatus: "online" });
    }
    io.emit("user_online", { userId });

    socket.on("send_message", async (data) => {
       const { receiverId, text } = data;
       
       if (!process.env.MONGODB_URI) {
           return socket.emit("error", { message: "Database not connected" });
       }

       // Find or create conversation
       let convo = await Conversation.findOne({
          participants: { $all: [userId, receiverId] }
       });

       if (!convo) {
          convo = new Conversation({ participants: [userId, receiverId] });
          await convo.save();
       }

       const newMessage = new Message({
          senderId: userId,
          receiverId: receiverId,
          conversationId: convo._id,
          text: text
       });

       await newMessage.save();

       convo.lastMessage = newMessage._id;
       await convo.save();

       const mData = await Message.findById(newMessage._id).populate("senderId receiverId", "username avatar");

       const receiverSocket = onlineUsers.get(receiverId);
       if (receiverSocket) {
          io.to(receiverSocket).emit("receive_message", mData);
       }
       socket.emit("receive_message", mData);
    });

    socket.on("typing", (data) => {
       const { receiverId, isTyping } = data;
       const receiverSocket = onlineUsers.get(receiverId);
       if (receiverSocket) {
          io.to(receiverSocket).emit("typing", { senderId: userId, isTyping });
       }
    });

    socket.on("mark_seen", async (data) => {
       const { conversationId } = data;
       if (!process.env.MONGODB_URI) return;
       await Message.updateMany(
           { conversationId, receiverId: userId, seen: false },
           { $set: { seen: true } }
       );
       
       const convo = await Conversation.findById(conversationId);
       if(convo) {
           const otherParticipant = convo.participants.find(p => p.toString() !== userId);
           if(otherParticipant) {
              const otherSocketId = onlineUsers.get(otherParticipant.toString());
              if(otherSocketId) {
                  io.to(otherSocketId).emit("messages_seen", { conversationId });
              }
           }
       }
    });

    // WebRTC Signaling
    socket.on("call_user", (data) => {
       const userToCall = data.userToCall;
       const socketId = onlineUsers.get(userToCall);
       if (socketId) {
          io.to(socketId).emit("incoming_call", { 
             signal: data.signalData, 
             from: userId, 
             callerName: data.callerName,
             callerAvatar: data.callerAvatar,
             isVideo: data.isVideo 
          });
       }
    });

    socket.on("answer_call", (data) => {
       const socketId = onlineUsers.get(data.to);
       if (socketId) {
          io.to(socketId).emit("call_accepted", data.signal);
       }
    });

    socket.on("end_call", (data) => {
       const socketId = onlineUsers.get(data.to);
       if (socketId) {
          io.to(socketId).emit("call_ended");
       }
    });

    socket.on("ice_candidate", (data) => {
       const socketId = onlineUsers.get(data.to);
       if (socketId) {
          io.to(socketId).emit("ice_candidate", { candidate: data.candidate, from: userId });
       }
    });

    socket.on("disconnect", async () => {
       onlineUsers.delete(userId);
       if (process.env.MONGODB_URI) {
          await User.findByIdAndUpdate(userId, { onlineStatus: "offline", lastSeen: new Date() });
       }
       io.emit("user_offline", { userId });
       console.log(`User disconnected: ${userId}`);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
