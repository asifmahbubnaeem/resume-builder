import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { checkJobFeature } from "../lib/subscriptionLimits.js";
import { fetchJobText, parseJobWithLLM } from "../lib/jobParser.js";
import { computeMatch } from "../lib/matchScorer.js";
import { generateResumePdf, generateCoverLetterPdf, isValidResumeTemplateId } from "../lib/pdfGenerator.js";
import { generateCoverLetter } from "../lib/coverLetter.js";
import { prisma } from "../lib/prisma.js";

export const jobRouter = Router();

jobRouter.use(authMiddleware);

jobRouter.post("/analyze", async (req: AuthRequest, res) => {
  try {
    const canUse = await checkJobFeature(req.user!.userId);
    if (!canUse) {
      res.status(403).json({ error: "Job matching is available on the paid plan." });
      return;
    }
    const { url, rawText } = req.body as { url?: string; rawText?: string };
    let text = rawText;
    if (url && !text) text = await fetchJobText(url);
    if (!text?.trim()) return res.status(400).json({ error: "Provide url or rawText" });

    const parsed = await parseJobWithLLM(text);
    const job = await prisma.job.create({
      data: {
        userId: req.user!.userId,
        sourceUrl: url ?? null,
        rawText: text,
        parsedRequirements: parsed ? JSON.stringify(parsed.requirements) : null,
        roleTitle: parsed?.roleTitle ?? null,
      },
    });

    const match = await computeMatch(req.user!.userId, parsed?.requirements ?? []);
    res.json({
      jobId: job.id,
      roleTitle: parsed?.roleTitle,
      requirements: parsed?.requirements ?? [],
      matchScore: match.score,
      missingRequirements: match.missing,
      matchingRequirements: match.matching,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Job analysis failed" });
  }
});

jobRouter.post("/:jobId/tailored-resume", async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.jobId;
    const { templateId } = req.body as { templateId?: string };
    const template = typeof templateId === "string" && isValidResumeTemplateId(templateId) ? templateId : "classic";
    const pdfUrl = await generateResumePdf(req.user!.userId, template, jobId);
    res.json({ url: pdfUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate tailored resume" });
  }
});

jobRouter.post("/:jobId/cover-letter", async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.jobId;
    const job = await prisma.job.findFirst({ where: { id: jobId, userId: req.user!.userId } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    const content = await generateCoverLetter(req.user!.userId, job.rawText);
    res.json({ content });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to generate cover letter" });
  }
});

jobRouter.post("/:jobId/cover-letter/export", async (req: AuthRequest, res) => {
  try {
    const jobId = req.params.jobId;
    const { content } = req.body as { content: string };
    const job = await prisma.job.findFirst({ where: { id: jobId, userId: req.user!.userId } });
    if (!job) return res.status(404).json({ error: "Job not found" });
    const pdfUrl = await generateCoverLetterPdf(req.user!.userId, jobId, content ?? "");
    res.json({ url: pdfUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to export cover letter PDF" });
  }
});
