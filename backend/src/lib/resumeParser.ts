import OpenAI from "openai";
import { prisma } from "./prisma.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const EXTRACTION_PROMPT = `You are a resume parser. Extract structured data from the following resume text.
Return ONLY valid JSON in this exact shape (no markdown, no explanation):
{
  "fullName": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "location": "string or null",
  "links": ["string array of URLs or labels like LinkedIn"],
  "professionTrack": "string or null - e.g. Test Engineer, Software Developer",
  "educations": [{"degree": "string", "institution": "string", "startDate": "string or null", "endDate": "string or null", "details": "string or null"}],
  "experiences": [{"role": "string", "company": "string", "startDate": "string or null", "endDate": "string or null", "bullets": ["string"]}],
  "skills": [{"name": "string", "category": "string or null"}]
}
If something is not found, use null or empty array.`;

export async function parseResumeWithLLM(
  extractedText: string,
  userId: string
): Promise<boolean> {
  if (!process.env.OPENAI_API_KEY) return false;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: extractedText.slice(0, 12000) },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return false;
    const data = JSON.parse(raw) as {
      fullName?: string | null;
      email?: string | null;
      phone?: string | null;
      location?: string | null;
      links?: string[];
      professionTrack?: string | null;
      educations?: Array<{ degree?: string; institution?: string; startDate?: string | null; endDate?: string | null; details?: string | null }>;
      experiences?: Array<{ role?: string; company?: string; startDate?: string | null; endDate?: string | null; bullets?: string[] }>;
      skills?: Array<{ name?: string; category?: string | null }>;
    };

    const profile = await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        fullName: data.fullName ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        location: data.location ?? null,
        links: Array.isArray(data.links) ? data.links : [],
        professionTrack: data.professionTrack ?? null,
      },
      update: {
        fullName: data.fullName ?? undefined,
        email: data.email ?? undefined,
        phone: data.phone ?? undefined,
        location: data.location ?? undefined,
        links: Array.isArray(data.links) ? data.links : undefined,
        professionTrack: data.professionTrack ?? undefined,
      },
    });

    if (data.educations?.length) {
      await prisma.education.deleteMany({ where: { profileId: profile.id } });
      for (let i = 0; i < data.educations.length; i++) {
        const e = data.educations[i];
        await prisma.education.create({
          data: {
            profileId: profile.id,
            degree: e.degree ?? "",
            institution: e.institution ?? "",
            startDate: e.startDate ?? null,
            endDate: e.endDate ?? null,
            details: e.details ?? null,
            orderIndex: i,
          },
        });
      }
    }
    if (data.experiences?.length) {
      await prisma.experience.deleteMany({ where: { profileId: profile.id } });
      for (let i = 0; i < data.experiences.length; i++) {
        const e = data.experiences[i];
        await prisma.experience.create({
          data: {
            profileId: profile.id,
            role: e.role ?? "",
            company: e.company ?? "",
            startDate: e.startDate ?? null,
            endDate: e.endDate ?? null,
            bullets: Array.isArray(e.bullets) ? e.bullets : [],
            orderIndex: i,
          },
        });
      }
    }
    if (data.skills?.length) {
      await prisma.skill.deleteMany({ where: { profileId: profile.id } });
      for (let i = 0; i < data.skills.length; i++) {
        const s = data.skills[i];
        await prisma.skill.create({
          data: {
            profileId: profile.id,
            name: s.name ?? "",
            category: s.category ?? null,
            orderIndex: i,
          },
        });
      }
    }
    return true;
  } catch {
    return false;
  }
}
