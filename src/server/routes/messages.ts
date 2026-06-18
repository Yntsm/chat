import express from "express";
import { getConversations, getMessages } from "../controllers/messageController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const router = express.Router();

router.get("/conversations", authenticateToken, getConversations);
router.get("/:otherUserId", authenticateToken, getMessages);

export default router;
