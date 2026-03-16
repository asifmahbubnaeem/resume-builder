import { Router } from "express";
import multer from "multer";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { extractText } from "../lib/extractText.js";
import { parseResumeWithLLM } from "../lib/resumeParser.js";

export const uploadRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

uploadRouter.use(authMiddleware);

uploadRouter.post("/", upload.single("file"), async (req: AuthRequest, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"];
    if (!allowed.includes(file.mimetype)) return res.status(400).json({ error: "Only PDF, DOC, DOCX, or TXT allowed" });

    const storageKey = `uploads/${req.user!.userId}/${Date.now()}-${file.originalname}`;
    const extractedText = await extractText(file.buffer, file.mimetype, file.originalname);

    await prisma.upload.create({
      data: {
        userId: req.user!.userId,
        filename: file.originalname,
        mimeType: file.mimetype,
        storageKey,
        extractedText: extractedText ?? undefined,
      },
    });

    if (extractedText) {
      console.log("Upload: extracted text length", extractedText.length);
      const parsed = await parseResumeWithLLM(extractedText, req.user!.userId);
      console.log("Upload: parseResumeWithLLM result", { parsed });
      if (parsed) {
        return res.json({
          extractedText: extractedText.slice(0, 500),
          parsed,
          message: "File uploaded and parsed. Profile updated.",
        });
      }
    }
    res.json({
      extractedText: extractedText?.slice(0, 500) ?? null,
      parsed: false,
      message: "File uploaded. Extracted text saved, but parsing did not run or failed.",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Upload failed" });
  }
});
