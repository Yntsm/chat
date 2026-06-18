import express from "express";
import { getDiscoverUsers, sendFriendRequest, getFriendRequests, respondFriendRequest, getFriends, updateProfile } from "../controllers/userController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const router = express.Router();

router.get("/discover", authenticateToken, getDiscoverUsers);
router.put("/profile", authenticateToken, updateProfile);
router.get("/friends", authenticateToken, getFriends);
router.post("/friends/request", authenticateToken, sendFriendRequest);
router.get("/friends/requests", authenticateToken, getFriendRequests);
router.post("/friends/respond", authenticateToken, respondFriendRequest);

export default router;
