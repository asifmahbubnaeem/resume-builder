import fs from "node:fs";
import path from "node:path";
import { prisma } from "./prisma.js";

type LimitsConfig = {
  freeMonthlyResumes: number;
  freeJobFeature: boolean;
};

function loadLimitsConfig(): LimitsConfig {
  try {
    const configPath = path.join(process.cwd(), "config", "limits.json");
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<LimitsConfig>;
    const freeMonthlyResumes =
      typeof parsed.freeMonthlyResumes === "number" && Number.isFinite(parsed.freeMonthlyResumes)
        ? parsed.freeMonthlyResumes
        : 2;
    const freeJobFeature =
      typeof parsed.freeJobFeature === "boolean"
        ? parsed.freeJobFeature
        : false;
    return { freeMonthlyResumes, freeJobFeature };
  } catch (e) {
    console.warn("[subscriptionLimits] Failed to load limits config, using defaults:", e);
    return {
      freeMonthlyResumes: 2,
      freeJobFeature: false,
    };
  }
}

const LIMITS = loadLimitsConfig();
const FREE_MONTHLY_RESUMES = LIMITS.freeMonthlyResumes;
const FREE_JOB_FEATURE = LIMITS.freeJobFeature; // paid only for job matching / cover letter

export async function checkResumeLimit(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.subscription === "paid") return true;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const count = await prisma.generatedPdf.count({
    where: { userId, type: "resume", createdAt: { gte: startOfMonth } },
  });
  return count < FREE_MONTHLY_RESUMES;
}

export async function checkJobFeature(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.subscription === "paid";
}

export async function getRemainingResumeExports(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.subscription === "paid") return Infinity;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const count = await prisma.generatedPdf.count({
    where: { userId, type: "resume", createdAt: { gte: startOfMonth } },
  });
  return Math.max(0, FREE_MONTHLY_RESUMES - count);
}
