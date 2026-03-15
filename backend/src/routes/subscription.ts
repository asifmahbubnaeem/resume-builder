import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { checkResumeLimit, checkJobFeature } from "../lib/subscriptionLimits.js";
import { prisma } from "../lib/prisma.js";

export const subscriptionRouter = Router();

subscriptionRouter.use(authMiddleware);

subscriptionRouter.get("/limits", async (req: AuthRequest, res) => {
  try {
    const canExportResume = await checkResumeLimit(req.user!.userId);
    const canUseJobFeature = await checkJobFeature(req.user!.userId);
    res.json({ canExportResume, canUseJobFeature });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get limits" });
  }
});

// Placeholder: upgrade to paid (for testing without Stripe). Replace with Stripe Checkout in production.
subscriptionRouter.post("/upgrade", async (req: AuthRequest, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { subscription: "paid" },
    });
    res.json({ subscription: "paid", message: "Upgraded. In production, use Stripe Checkout." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upgrade failed" });
  }
});
