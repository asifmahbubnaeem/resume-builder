import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { getNextOnboardingStep, submitOnboardingAnswer, getNextAddSkillStep, submitAddSkillAnswer, getNextAddExperienceStep, submitAddExperienceAnswer } from "../lib/conversationEngine.js";

export const conversationRouter = Router();

conversationRouter.use(authMiddleware);

// Onboarding (from scratch)
conversationRouter.get("/onboarding/step", async (req: AuthRequest, res) => {
  try {
    const step = await getNextOnboardingStep(req.user!.userId);
    res.json(step);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get step" });
  }
});

conversationRouter.post("/onboarding/answer", async (req: AuthRequest, res) => {
  try {
    const { answer } = req.body as { answer: string };
    const next = await submitOnboardingAnswer(req.user!.userId, answer);
    res.json(next);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

// Add skill flow
conversationRouter.get("/add-skill/step", async (req: AuthRequest, res) => {
  try {
    const step = await getNextAddSkillStep(req.user!.userId);
    res.json(step);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get step" });
  }
});

conversationRouter.post("/add-skill/answer", async (req: AuthRequest, res) => {
  try {
    const { answer } = req.body as { answer: string };
    const next = await submitAddSkillAnswer(req.user!.userId, answer);
    res.json(next);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});

// Add experience flow
conversationRouter.get("/add-experience/step", async (req: AuthRequest, res) => {
  try {
    const step = await getNextAddExperienceStep(req.user!.userId);
    res.json(step);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get step" });
  }
});

conversationRouter.post("/add-experience/answer", async (req: AuthRequest, res) => {
  try {
    const { answer } = req.body as { answer: string };
    const next = await submitAddExperienceAnswer(req.user!.userId, answer);
    res.json(next);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to submit answer" });
  }
});
