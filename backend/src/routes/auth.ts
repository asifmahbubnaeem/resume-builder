import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthRequest, type JwtPayload } from "../middleware/auth.js";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-min-32-characters-long";

authRouter.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, subscription: "free" },
      select: { id: true, email: true, subscription: true, createdAt: true },
    });
    const token = jwt.sign(
      { userId: user.id, email: user.email } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(201).json({ user, token });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Registration failed" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const token = jwt.sign(
      { userId: user.id, email: user.email } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      user: { id: user.id, email: user.email, subscription: user.subscription, createdAt: user.createdAt },
      token,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login failed" });
  }
});

authRouter.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, subscription: true, createdAt: true, profile: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get user" });
  }
});
