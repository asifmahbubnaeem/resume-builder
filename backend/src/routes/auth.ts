import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthRequest, type JwtPayload } from "../middleware/auth.js";
import { sendEmailVerification } from "../lib/email.js";

export const authRouter = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-min-32-characters-long";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;

async function createEmailVerificationToken(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000);
  await prisma.emailVerificationToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });
  return token;
}

async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${APP_BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmailVerification(email, verifyUrl);
}

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
      data: { email, passwordHash, subscription: "free", verified: false },
      select: { id: true, email: true, subscription: true, createdAt: true },
    });

    const token = await createEmailVerificationToken(user.id);
    await sendVerificationEmail(user.email, token);

    res.status(201).json({
      message: "Registration successful. Please check your email to verify your address before logging in.",
    });
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
    if (!user.verified) {
      res.status(403).json({ error: "Email not verified. Please check your inbox for the verification link." });
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

authRouter.get("/verify-email", async (req, res) => {
  try {
    const token = req.query.token as string | undefined;
    if (!token) {
      res.status(400).json({ error: "Missing token" });
      return;
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record) {
      res.status(400).json({ error: "Invalid or expired verification token" });
      return;
    }

    if (record.usedAt) {
      res.status(400).json({ error: "Verification token has already been used" });
      return;
    }

    if (record.expiresAt.getTime() < Date.now()) {
      res.status(400).json({ error: "Verification token has expired" });
      return;
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { verified: true },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: "Email verified successfully. You can now log in." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to verify email" });
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
