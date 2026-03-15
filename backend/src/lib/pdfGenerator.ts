import puppeteer from "puppeteer";
import { prisma } from "./prisma.js";
import { getProfileForResume, type ResumeData } from "./profileForResume.js";

function buildResumeHtml(data: ResumeData, templateId: string): string {
  const escape = (s: string | null) => (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const name = escape(data.fullName) || "Your Name";
  const contact = [data.email, data.phone, data.location].filter(Boolean).map(escape).join(" · ");
  const links = data.links.length ? `<p>${data.links.map((l) => `<a href="${escape(l)}">${escape(l)}</a>`).join(" · ")}</p>` : "";
  const track = data.professionTrack ? `<p><em>${escape(data.professionTrack)}</em></p>` : "";
  const education = data.educations
    .map(
      (e) =>
        `<div><strong>${escape(e.degree)}</strong> — ${escape(e.institution)}${e.startDate || e.endDate ? ` (${[e.startDate, e.endDate].filter(Boolean).join(" – ")})` : ""}${e.gpa ? ` · ${escape(e.gpa)}` : ""}${e.honors ? ` · ${escape(e.honors)}` : ""}${e.details ? `<br/>${escape(e.details)}` : ""}</div>`
    )
    .join("");
  const certifications = (data.certifications ?? [])
    .map((c) => `<div>${escape(c.name)}${c.issuer ? ` — ${escape(c.issuer)}` : ""}${c.date ? ` (${escape(c.date)})` : ""}</div>`)
    .join("");
  const awards = (data.awards ?? [])
    .map((a) => `<div><strong>${escape(a.title)}</strong>${a.issuer ? ` — ${escape(a.issuer)}` : ""}${a.date ? ` (${escape(a.date)})` : ""}${a.description ? `<br/>${escape(a.description)}` : ""}</div>`)
    .join("");
  const experience = data.experiences
    .map(
      (e) =>
        `<div><strong>${escape(e.role)}</strong> at ${escape(e.company)}${e.startDate || e.endDate ? ` (${[e.startDate, e.endDate].filter(Boolean).join(" – ")})` : ""}<ul>${e.bullets.map((b) => `<li>${escape(b)}</li>`).join("")}</ul></div>`
    )
    .join("");
  const skills = data.skills.map((s) => escape(s.name)).join(", ");

  const font = templateId === "modern" ? '"Segoe UI", sans-serif' : "Georgia, serif";
  const accent = templateId === "modern" ? "#2563eb" : "#1f2937";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: ${font}; font-size: 11pt; line-height: 1.4; color: #1f2937; max-width: 800px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 24pt; margin: 0 0 8px 0; color: ${accent}; }
    .contact { color: #6b7280; margin-bottom: 16px; }
    h2 { font-size: 12pt; text-transform: uppercase; letter-spacing: 0.05em; color: ${accent}; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 20px 0 8px 0; }
    ul { margin: 4px 0; padding-left: 20px; }
    div + div { margin-top: 12px; }
    a { color: ${accent}; }
  </style>
</head>
<body>
  <h1>${name}</h1>
  <div class="contact">${contact}</div>
  ${links}
  ${track}
  <h2>Education</h2>
  ${education || "<p>—</p>"}
  <h2>Experience</h2>
  ${experience || "<p>—</p>"}
  <h2>Skills</h2>
  <p>${skills || "—"}</p>
  ${(data.certifications?.length ?? 0) > 0 ? `<h2>Certifications</h2>${certifications}` : ""}
  ${(data.awards?.length ?? 0) > 0 ? `<h2>Awards</h2>${awards}` : ""}
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
  let pdfBuffer: Buffer;
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
    return `data:application/pdf;base64,${pdfBuffer.toString("base64")}`;
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
