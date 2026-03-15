import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { getProfileForResume } from "../lib/profileForResume.js";
import { generateResumePdf, getResumeTemplates, isValidResumeTemplateId } from "../lib/pdfGenerator.js";
import { checkResumeLimit } from "../lib/subscriptionLimits.js";

export const resumeRouter = Router();

resumeRouter.use(authMiddleware);

resumeRouter.get("/draft", async (req: AuthRequest, res) => {
  try {
    const data = await getProfileForResume(req.user!.userId);
    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get draft" });
  }
});

resumeRouter.get("/templates", (_req, res) => {
  res.json(getResumeTemplates());
});

resumeRouter.post("/export", async (req: AuthRequest, res) => {
  try {
    const canExport = await checkResumeLimit(req.user!.userId);
    if (!canExport) {
      res.status(403).json({ error: "Resume export limit reached this month. Upgrade for unlimited exports." });
      return;
    }
    const { templateId } = req.body as { templateId?: string };
    const template = typeof templateId === "string" && isValidResumeTemplateId(templateId) ? templateId : "classic";
    const pdfUrl = await generateResumePdf(req.user!.userId, template, null);
    res.json({ url: pdfUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});
