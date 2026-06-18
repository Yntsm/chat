import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { userId: string };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: "Access denied. No token provided." });
    return;
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as { userId: string };
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid token." });
  }
};
