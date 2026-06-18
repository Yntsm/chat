import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.ts";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }
    
    const { username, email, password } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      res.status(400).json({ error: "User already exists" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });
    
    res.status(201).json({ 
      token, 
      user: { id: newUser._id, username: newUser.username, email: newUser.email, avatar: newUser.avatar } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ error: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password as string);
    if (!isMatch) {
       res.status(400).json({ error: "Invalid credentials" });
       return;
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });
    
    res.json({ 
      token, 
      user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
   try {
      if (!process.env.MONGODB_URI) { res.status(503).json({ error: "Database not configured" }); return; }
      const authReq = req as any;
      const user = await User.findById(authReq.user.userId).select("-password");
      if (!user) { res.status(404).json({ error: "User not found" }); return; }
      res.json(user);
   } catch (error) {
      res.status(500).json({ error: "Server error" });
   }
};
