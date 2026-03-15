import puppeteer from "puppeteer";
import { prisma } from "./prisma.js";
import { getProfileForResume, type ResumeData } from "./profileForResume.js";

export interface ResumeTemplateMeta {
  id: string;
  name: string;
  description: string;
}

type LayoutType = "default" | "table" | "bullet" | "descriptive" | "multipanel";

interface TemplateStyle {
  font: string;
  accent: string;
  headingStyle?: "uppercase" | "normal";
  layout: LayoutType;
}

const RESUME_TEMPLATES: Record<string, TemplateStyle> = {
  classic: {
    font: "Georgia, serif",
    accent: "#1f2937",
    headingStyle: "uppercase",
    layout: "default",
  },
  modern: {
    font: '"Segoe UI", Tahoma, sans-serif',
    accent: "#2563eb",
    headingStyle: "uppercase",
    layout: "default",
  },
  minimal: {
    font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    accent: "#374151",
    headingStyle: "normal",
    layout: "default",
  },
  table: {
    font: '"Segoe UI", Tahoma, sans-serif',
    accent: "#1e40af",
    headingStyle: "uppercase",
    layout: "table",
  },
  bullet: {
    font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    accent: "#059669",
    headingStyle: "uppercase",
    layout: "bullet",
  },
  descriptive: {
    font: "Georgia, serif",
    accent: "#4b5563",
    headingStyle: "normal",
    layout: "descriptive",
  },
  multipanel: {
    font: '"Segoe UI", Tahoma, sans-serif',
    accent: "#7c3aed",
    headingStyle: "uppercase",
    layout: "multipanel",
  },
};

const RESUME_TEMPLATES_LIST: ResumeTemplateMeta[] = [
  { id: "classic", name: "Classic", description: "Traditional serif layout, ideal for conservative industries." },
  { id: "modern", name: "Modern", description: "Clean sans-serif with blue accents, great for tech and startups." },
  { id: "minimal", name: "Minimal", description: "Simple and understated, focuses on content over style." },
  { id: "table", name: "Table", description: "Table layout for education and experience; clear rows and columns." },
  { id: "bullet", name: "Bullet", description: "Bullet-heavy; experience and skills as lists, compact." },
  { id: "descriptive", name: "Descriptive", description: "Paragraph-style summaries; less list-heavy, more prose." },
  { id: "multipanel", name: "Two-panel", description: "Two-column layout with sidebar for contact and skills." },
];

export function getResumeTemplates(): ResumeTemplateMeta[] {
  return [...RESUME_TEMPLATES_LIST];
}

export function isValidResumeTemplateId(id: string): boolean {
  return id in RESUME_TEMPLATES;
}

const escape = (s: string | null) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

interface EscapedFragments {
  name: string;
  contact: string;
  links: string;
  track: string;
  education: string;
  experience: string;
  skills: string;
  certifications: string;
  awards: string;
  educationTableRows: string;
  experienceTableRows: string;
}

function buildFragments(data: ResumeData): EscapedFragments {
  const name = escape(data.fullName) || "Your Name";
  const contact = [data.email, data.phone, data.location].filter(Boolean).map(escape).join(" · ");
  const links = data.links.length ? data.links.map((l) => `<a href="${escape(l)}">${escape(l)}</a>`).join(" · ") : "";
  const track = data.professionTrack ? escape(data.professionTrack) : "";

  const education = data.educations
    .map(
      (e) =>
        `<div><strong>${escape(e.degree)}</strong> — ${escape(e.institution)}${e.startDate || e.endDate ? ` (${[e.startDate, e.endDate].filter(Boolean).join(" – ")})` : ""}${e.gpa ? ` · ${escape(e.gpa)}` : ""}${e.honors ? ` · ${escape(e.honors)}` : ""}${e.details ? `<br/>${escape(e.details)}` : ""}</div>`
    )
    .join("");

  const educationTableRows = data.educations
    .map(
      (e) =>
        `<tr><td>${[e.startDate, e.endDate].filter(Boolean).join(" – ") || "—"}</td><td><strong>${escape(e.degree)}</strong><br/>${escape(e.institution)}${e.details ? `<br/>${escape(e.details)}` : ""}</td><td>${escape(e.gpa) || "—"}${e.honors ? ` · ${escape(e.honors)}` : ""}</td></tr>`
    )
    .join("");

  const experienceTableRows = data.experiences
    .map(
      (e) =>
        `<tr><td>${[e.startDate, e.endDate].filter(Boolean).join(" – ") || "—"}</td><td><strong>${escape(e.role)}</strong><br/>${escape(e.company)}</td><td>${e.bullets.map((b) => escape(b)).join("<br/>") || "—"}</td></tr>`
    )
    .join("");

  const experience = data.experiences
    .map(
      (e) =>
        `<div><strong>${escape(e.role)}</strong> at ${escape(e.company)}${e.startDate || e.endDate ? ` (${[e.startDate, e.endDate].filter(Boolean).join(" – ")})` : ""}<ul>${e.bullets.map((b) => `<li>${escape(b)}</li>`).join("")}</ul></div>`
    )
    .join("");

  const certifications = (data.certifications ?? [])
    .map((c) => `<div>${escape(c.name)}${c.issuer ? ` — ${escape(c.issuer)}` : ""}${c.date ? ` (${escape(c.date)})` : ""}</div>`)
    .join("");

  const awards = (data.awards ?? [])
    .map((a) => `<div><strong>${escape(a.title)}</strong>${a.issuer ? ` — ${escape(a.issuer)}` : ""}${a.date ? ` (${escape(a.date)})` : ""}${a.description ? `<br/>${escape(a.description)}` : ""}</div>`)
    .join("");

  const skills = data.skills.map((s) => escape(s.name)).join(", ");

  return {
    name,
    contact,
    links: links ? `<p>${links}</p>` : "",
    track: track ? `<p><em>${track}</em></p>` : "",
    education,
    experience,
    skills,
    certifications,
    awards,
    educationTableRows,
    experienceTableRows,
  };
}

function buildDefaultLayout(data: ResumeData, t: TemplateStyle, f: EscapedFragments): string {
  const h2Transform = t.headingStyle === "uppercase" ? "uppercase" : "none";
  const h2LetterSpacing = t.headingStyle === "uppercase" ? "0.05em" : "0";
  return `
  <h1>${f.name}</h1>
  <div class="contact">${f.contact}</div>
  ${f.links}
  ${f.track}
  <h2>Education</h2>
  ${f.education || "<p>—</p>"}
  <h2>Experience</h2>
  ${f.experience || "<p>—</p>"}
  <h2>Skills</h2>
  <p>${f.skills || "—"}</p>
  ${(data.certifications?.length ?? 0) > 0 ? `<h2>Certifications</h2>${f.certifications}` : ""}
  ${(data.awards?.length ?? 0) > 0 ? `<h2>Awards</h2>${f.awards}` : ""}`;
}

function buildTableLayout(data: ResumeData, t: TemplateStyle, f: EscapedFragments): string {
  const h2Transform = t.headingStyle === "uppercase" ? "uppercase" : "none";
  const h2LetterSpacing = t.headingStyle === "uppercase" ? "0.05em" : "0";
  return `
  <h1>${f.name}</h1>
  <div class="contact">${f.contact}</div>
  ${f.links}
  ${f.track}
  <h2>Education</h2>
  <table class="resume-table"><thead><tr><th>Period</th><th>Degree / Institution</th><th>Details</th></tr></thead><tbody>${f.educationTableRows || "<tr><td colspan=\"3\">—</td></tr>"}</tbody></table>
  <h2>Experience</h2>
  <table class="resume-table"><thead><tr><th>Period</th><th>Role / Company</th><th>Highlights</th></tr></thead><tbody>${f.experienceTableRows || "<tr><td colspan=\"3\">—</td></tr>"}</tbody></table>
  <h2>Skills</h2>
  <p>${f.skills || "—"}</p>
  ${(data.certifications?.length ?? 0) > 0 ? `<h2>Certifications</h2>${f.certifications}` : ""}
  ${(data.awards?.length ?? 0) > 0 ? `<h2>Awards</h2>${f.awards}` : ""}`;
}

function buildBulletLayout(data: ResumeData, t: TemplateStyle, f: EscapedFragments): string {
  const skillsList = data.skills.length
    ? `<ul class="skill-list">${data.skills.map((s) => `<li>${escape(s.name)}</li>`).join("")}</ul>`
    : "<p>—</p>";
  const educationBullets = data.educations
    .map(
      (e) =>
        `<li><strong>${escape(e.degree)}</strong> — ${escape(e.institution)}${e.startDate || e.endDate ? ` (${[e.startDate, e.endDate].filter(Boolean).join(" – ")})` : ""}${e.details ? `<br/>${escape(e.details)}` : ""}</li>`
    )
    .join("");
  return `
  <h1>${f.name}</h1>
  <div class="contact">${f.contact}</div>
  ${f.links}
  ${f.track}
  <h2>Education</h2>
  <ul class="section-list">${educationBullets || "<li>—</li>"}</ul>
  <h2>Experience</h2>
  ${f.experience || "<p>—</p>"}
  <h2>Skills</h2>
  ${skillsList}
  ${(data.certifications?.length ?? 0) > 0 ? `<h2>Certifications</h2><ul class="section-list">${(data.certifications ?? []).map((c) => `<li>${escape(c.name)}${c.issuer ? ` — ${escape(c.issuer)}` : ""}</li>`).join("")}</ul>` : ""}
  ${(data.awards?.length ?? 0) > 0 ? `<h2>Awards</h2>${f.awards}` : ""}`;
}

function buildDescriptiveLayout(data: ResumeData, t: TemplateStyle, f: EscapedFragments): string {
  const educationParagraphs = data.educations
    .map(
      (e) =>
        `<p class="descriptive-p">${escape(e.degree)} from ${escape(e.institution)}${e.startDate || e.endDate ? ` (${[e.startDate, e.endDate].filter(Boolean).join(" – ")})` : ""}.${e.details ? ` ${escape(e.details)}` : ""}${e.gpa ? ` GPA: ${escape(e.gpa)}.` : ""}${e.honors ? ` ${escape(e.honors)}.` : ""}</p>`
    )
    .join("");
  const experienceParagraphs = data.experiences
    .map(
      (e) =>
        `<p class="descriptive-p"><strong>${escape(e.role)}</strong> at ${escape(e.company)}${e.startDate || e.endDate ? ` (${[e.startDate, e.endDate].filter(Boolean).join(" – ")})` : ""}. ${e.bullets.map((b) => escape(b)).join(" ")}</p>`
    )
    .join("");
  return `
  <h1>${f.name}</h1>
  <div class="contact">${f.contact}</div>
  ${f.links}
  ${f.track}
  <h2>Education</h2>
  ${educationParagraphs || "<p>—</p>"}
  <h2>Experience</h2>
  ${experienceParagraphs || "<p>—</p>"}
  <h2>Skills</h2>
  <p>${f.skills || "—"}</p>
  ${(data.certifications?.length ?? 0) > 0 ? `<h2>Certifications</h2>${f.certifications}` : ""}
  ${(data.awards?.length ?? 0) > 0 ? `<h2>Awards</h2>${f.awards}` : ""}`;
}

function buildMultipanelLayout(data: ResumeData, t: TemplateStyle, f: EscapedFragments): string {
  const skillsList = data.skills.length
    ? `<ul class="sidebar-list">${data.skills.map((s) => `<li>${escape(s.name)}</li>`).join("")}</ul>`
    : "<p>—</p>";
  const certsBlock =
    (data.certifications?.length ?? 0) > 0
      ? `<h3>Certifications</h3><ul class="sidebar-list">${(data.certifications ?? []).map((c) => `<li>${escape(c.name)}</li>`).join("")}</ul>`
      : "";
  return `
  <div class="two-panel">
    <aside class="sidebar">
      <h1>${f.name}</h1>
      <div class="contact">${f.contact}</div>
      ${f.links}
      <h3>Skills</h3>
      ${skillsList}
      ${certsBlock}
    </aside>
    <main class="main-panel">
      ${f.track}
      <h2>Profile</h2>
      <p class="track-p">${data.professionTrack ? escape(data.professionTrack) : "—"}</p>
      <h2>Education</h2>
      ${f.education || "<p>—</p>"}
      <h2>Experience</h2>
      ${f.experience || "<p>—</p>"}
      ${(data.awards?.length ?? 0) > 0 ? `<h2>Awards</h2>${f.awards}` : ""}
    </main>
  </div>`;
}

function getBaseStyles(t: TemplateStyle, layout: LayoutType): string {
  const h2Transform = t.headingStyle === "uppercase" ? "uppercase" : "none";
  const h2LetterSpacing = t.headingStyle === "uppercase" ? "0.05em" : "0";
  const base = `
    body { font-family: ${t.font}; font-size: 11pt; line-height: 1.4; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 24pt; margin: 0 0 8px 0; color: ${t.accent}; }
    .contact { color: #6b7280; margin-bottom: 16px; }
    h2 { font-size: 12pt; text-transform: ${h2Transform}; letter-spacing: ${h2LetterSpacing}; color: ${t.accent}; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 20px 0 8px 0; }
    ul { margin: 4px 0; padding-left: 20px; }
    div + div { margin-top: 12px; }
    a { color: ${t.accent}; }`;
  const tableStyles =
    layout === "table"
      ? `
    table.resume-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    table.resume-table th, table.resume-table td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; vertical-align: top; }
    table.resume-table th { background: #f9fafb; color: ${t.accent}; font-size: 10pt; }`
      : "";
  const bulletStyles =
    layout === "bullet"
      ? `
    ul.section-list, ul.skill-list { margin: 6px 0; padding-left: 22px; }
    ul.section-list li, ul.skill-list li { margin-bottom: 4px; }`
      : "";
  const descriptiveStyles =
    layout === "descriptive"
      ? `
    p.descriptive-p { margin: 8px 0 12px 0; text-align: justify; }`
      : "";
  const multipanelStyles =
    layout === "multipanel"
      ? `
    body { max-width: 100%; padding: 16px; }
    .two-panel { display: flex; gap: 24px; max-width: 900px; margin: 0 auto; }
    .sidebar { width: 220px; flex-shrink: 0; padding-right: 20px; border-right: 1px solid #e5e7eb; }
    .sidebar h1 { font-size: 18pt; margin-bottom: 8px; }
    .sidebar h3 { font-size: 11pt; color: ${t.accent}; margin: 16px 0 6px 0; text-transform: uppercase; }
    .main-panel { flex: 1; min-width: 0; }
    .sidebar-list { padding-left: 18px; margin: 4px 0; }
    .track-p { margin: 4px 0 12px 0; }`
      : "";
  return base + tableStyles + bulletStyles + descriptiveStyles + multipanelStyles;
}

function buildResumeHtml(data: ResumeData, templateId: string): string {
  const tid = isValidResumeTemplateId(templateId) ? templateId : "classic";
  const t = RESUME_TEMPLATES[tid];
  const layout = t.layout;
  const f = buildFragments(data);

  const bodyContent =
    layout === "table"
      ? buildTableLayout(data, t, f)
      : layout === "bullet"
        ? buildBulletLayout(data, t, f)
        : layout === "descriptive"
          ? buildDescriptiveLayout(data, t, f)
          : layout === "multipanel"
            ? buildMultipanelLayout(data, t, f)
            : buildDefaultLayout(data, t, f);

  const styles = getBaseStyles(t, layout);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${styles}
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

export async function generateResumePdf(
  userId: string,
  templateId: string,
  jobId: string | null
): Promise<string> {
  let keywords: string[] | undefined;
  if (jobId) {
    const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
    if (job?.parsedRequirements) {
      try {
        keywords = JSON.parse(job.parsedRequirements) as string[];
      } catch {
        keywords = undefined;
      }
    }
  }
  const data = await getProfileForResume(userId, keywords);
  const html = buildResumeHtml(data, templateId);

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  let pdfBuffer: Buffer | Uint8Array;
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }

  const bucket = process.env.S3_BUCKET ?? "resume-builder";
  const key = `resumes/${userId}/${Date.now()}.pdf`;
  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }),
    });
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      })
    );
  } catch (e) {
    console.error("S3 upload failed, returning data URL for dev", e);
    return `data:application/pdf;base64,${Buffer.from(pdfBuffer).toString("base64")}`;
  }

  await prisma.generatedPdf.create({
    data: { userId, type: "resume", storageKey: key, templateId, jobId },
  });

  const { getSignedUrl: presign } = await import("@aws-sdk/s3-request-presigner");
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new (await import("@aws-sdk/client-s3")).S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }),
  });
  const url = await presign(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
  return url;
}

export async function generateCoverLetterPdf(userId: string, jobId: string, content: string): Promise<string> {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.5; max-width: 700px; margin: 0 auto; padding: 40px; white-space: pre-wrap; }
  </style>
</head>
<body>${content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</body>
</html>`;
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfBuffer = await page.pdf({ format: "A4" });
  await browser.close();

  const bucket = process.env.S3_BUCKET ?? "resume-builder";
  const key = `cover-letters/${userId}/${jobId}-${Date.now()}.pdf`;
  try {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({
      region: process.env.S3_REGION ?? "us-east-1",
      ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }),
    });
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: pdfBuffer, ContentType: "application/pdf" }));
  } catch {
    return `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
  }
  await prisma.generatedPdf.create({ data: { userId, type: "cover_letter", storageKey: key, jobId } });
  const { getSignedUrl: presign } = await import("@aws-sdk/s3-request-presigner");
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new (await import("@aws-sdk/client-s3")).S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }),
  });
  return presign(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 });
}
