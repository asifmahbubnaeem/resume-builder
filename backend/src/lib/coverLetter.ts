import OpenAI from "openai";
import { getProfileForResume } from "./profileForResume.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateCoverLetter(userId: string, jobDescription: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return "Configure OPENAI_API_KEY to generate cover letters.";
  }
  const profile = await getProfileForResume(userId);
  const profileSummary = [
    profile.fullName && `Name: ${profile.fullName}`,
    profile.professionTrack && `Target role: ${profile.professionTrack}`,
    profile.experiences.length && `Experience: ${profile.experiences.map((e) => `${e.role} at ${e.company}`).join("; ")}`,
    profile.skills.length && `Skills: ${profile.skills.map((s) => s.name).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You write professional, concise cover letters. Use only information provided in the candidate profile. Do not invent experience or skills. Keep to 3-4 short paragraphs. Output plain text only, no headers or labels.",
      },
      {
        role: "user",
        content: `Candidate profile:\n${profileSummary}\n\nJob description:\n${jobDescription.slice(0, 6000)}\n\nWrite a cover letter that matches the candidate to this job.`,
      },
    ],
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  return raw.trim();
}
