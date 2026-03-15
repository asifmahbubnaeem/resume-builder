import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { profileRouter } from "./routes/profile.js";
import { uploadRouter } from "./routes/upload.js";
import { resumeRouter } from "./routes/resume.js";
import { jobRouter } from "./routes/job.js";
import { conversationRouter } from "./routes/conversation.js";
import { subscriptionRouter } from "./routes/subscription.js";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors({ origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", credentials: true }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/profile", profileRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/resume", resumeRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/conversation", conversationRouter);
app.use("/api/subscription", subscriptionRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
