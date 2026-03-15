import { prisma } from "./prisma.js";

function normalize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function tokenSet(str: string): Set<string> {
  return new Set(normalize(str));
}

export async function computeMatch(
  userId: string,
  requirements: string[]
): Promise<{ score: number; missing: string[]; matching: string[] }> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { skills: true, experiences: true, educations: true },
  });
  const reqSet = new Set(requirements.map((r) => normalize(r).join(" ")).filter(Boolean));
  if (reqSet.size === 0) {
    return { score: 100, missing: [], matching: [] };
  }

  const skillTokens = new Set<string>();
  const expText: string[] = [];
  if (profile) {
    profile.skills.forEach((s) => normalize(s.name).forEach((t) => skillTokens.add(t)));
    profile.experiences.forEach((e) => {
      expText.push(e.role, e.company, ...e.bullets);
    });
  }
  const expTokenSet = new Set(normalize(expText.join(" ")));
  const allProfileTokens = new Set([...skillTokens, ...expTokenSet]);

  const matching: string[] = [];
  const missing: string[] = [];
  for (const req of requirements) {
    const reqTokens = normalize(req);
    const reqKey = reqTokens.join(" ");
    if (!reqKey) continue;
    const found =
      reqTokens.some((t) => allProfileTokens.has(t)) ||
      [...allProfileTokens].some((t) => reqTokens.some((r) => r.includes(t) || t.includes(r)));
    if (found) matching.push(req);
    else missing.push(req);
  }

  const score = requirements.length ? Math.round((matching.length / requirements.length) * 100) : 100;
  return { score, missing, matching };
}
