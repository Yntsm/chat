import { Request, Response } from "express";
import { User } from "../models/User.ts";
import { FriendRequest } from "../models/FriendRequest.ts";

export const getDiscoverUsers = async (req: Request, res: Response): Promise<void> => {
  try {
     if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }
     const authReq = req as any;
     const currentUserId = authReq.user.userId;
     
     const existingRequests = await FriendRequest.find({
        $or: [{ senderId: currentUserId }, { receiverId: currentUserId }]
     });
     const excludeIds = existingRequests.map(r => r.senderId.toString() === currentUserId.toString() ? r.receiverId : r.senderId);
     excludeIds.push(currentUserId);

     const users = await User.find({ _id: { $nin: excludeIds } }).select("-password").limit(50);
     res.json(users);
  } catch (error) {
     res.status(500).json({ error: "Server error" });
  }
};

export const sendFriendRequest = async (req: Request, res: Response): Promise<void> => {
  try {
     if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }
     const authReq = req as any;
     const senderId = authReq.user.userId;
     const { receiverId } = req.body;

     if (senderId === receiverId) {
        res.status(400).json({ error: "Cannot send request to yourself" }); return;
     }

     const existing = await FriendRequest.findOne({
        $or: [
           { senderId, receiverId },
           { senderId: receiverId, receiverId: senderId }
        ]
     });

     if (existing) {
        res.status(400).json({ error: "Request already exists or are already friends" }); return;
     }

     const request = new FriendRequest({ senderId, receiverId });
     await request.save();
     
     res.json({ message: "Friend request sent", request });
  } catch (error) {
     res.status(500).json({ error: "Server error" });
  }
};

export const getFriendRequests = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }
    const authReq = req as any;
    const userId = authReq.user.userId;
    
    const requests = await FriendRequest.find({ receiverId: userId, status: "pending" })
      .populate("senderId", "username avatar onlineStatus");
      
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const respondFriendRequest = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }
    const authReq = req as any;
    const userId = authReq.user.userId;
    const { requestId, action } = req.body; // action: 'accepted' or 'rejected'
    
    if (!["accepted", "rejected"].includes(action)) {
       res.status(400).json({ error: "Invalid action" }); return;
    }

    const request = await FriendRequest.findOne({ _id: requestId, receiverId: userId });
    if (!request) { res.status(404).json({ error: "Request not found" }); return; }

    request.status = action;
    await request.save();
    
    res.json({ message: `Request ${action}` });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }
    const authReq = req as any;
    const userId = authReq.user.userId;
    const { bio, avatar, interests } = req.body;
    
    const user = await User.findByIdAndUpdate(userId, { bio, avatar, interests }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// We will also treat "accepted" requests as the friends list.
export const getFriends = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }
    const authReq = req as any;
    const userId = authReq.user.userId;

    const acceptedRequests = await FriendRequest.find({
       $or: [{ senderId: userId }, { receiverId: userId }],
       status: "accepted"
    }).populate("senderId receiverId", "username avatar onlineStatus bio interests");

    // Extract the friends
    const friends = acceptedRequests.map((req: any) => {
       return req.senderId._id.toString() === userId.toString() ? req.receiverId : req.senderId;
    });

    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
