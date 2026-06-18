import mongoose from "mongoose";

const FriendRequestSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
}, {
  timestamps: true
});

// Ensure a user can only send one request to another user
FriendRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

export const FriendRequest = mongoose.model("FriendRequest", FriendRequestSchema);
