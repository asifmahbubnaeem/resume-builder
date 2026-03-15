import * as cheerio from "cheerio";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function fetchJobText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ResumeBuilder/1.0)" },
  });
  if (!res.ok) throw new Error("Failed to fetch job URL");
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}

const JOB_PARSE_PROMPT = `You are a job posting analyzer. From the following job description text, extract:
1. roleTitle: the job title (e.g. "Senior Test Engineer")
2. requirements: an array of distinct requirement/skill keywords or short phrases (e.g. "Python", "manual testing", "CI/CD", "Selenium", "5 years experience"). Include only concrete skills and requirements, not generic fluff.

Return ONLY valid JSON: { "roleTitle": "string", "requirements": ["string"] }
No markdown, no explanation.`;

export async function parseJobWithLLM(text: string): Promise<{ roleTitle: string; requirements: string[] } | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: JOB_PARSE_PROMPT },
        { role: "user", content: text.slice(0, 8000) },
      ],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw) as { roleTitle: string; requirements: string[] };
  } catch {
    return null;
  }
}
