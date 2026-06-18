import { Request, Response } from "express";
import { Message } from "../models/Message.ts";
import { Conversation } from "../models/Conversation.ts";
import mongoose from "mongoose";

export const getConversations = async (req: Request, res: Response): Promise<void> => {
   try {
      if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }
      const authReq = req as any;
      const userId = authReq.user.userId;

      const convos = await Conversation.find({ participants: userId })
          .populate("participants", "username avatar onlineStatus")
          .populate("lastMessage");

      res.json(convos);
   } catch (error) {
      res.status(500).json({ error: "Server error" });
   }
};

export const getMessages = async (req: Request, res: Response): Promise<void> => {
   try {
      if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }
      const authReq = req as any;
      const userId = authReq.user.userId;
      const { otherUserId } = req.params;

      // Find conversation between them
      let convo = await Conversation.findOne({
          participants: { $all: [userId, otherUserId] }
      });

      if (!convo) {
          res.json([]);
          return;
      }

      const messages = await Message.find({ conversationId: convo._id }).sort({ createdAt: 1 });
      res.json(messages);
   } catch (error) {
      res.status(500).json({ error: "Server error" });
   }
};
