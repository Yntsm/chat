import express from "express";
import { register, login, getMe } from "../controllers/authController.ts";
import { authenticateToken } from "../middleware/auth.ts";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);

export default router;
