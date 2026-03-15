const getPdfParse = () => import("pdf-parse").then((m) => (m as { default: (buf: Buffer) => Promise<{ text: string }> }).default);
import mammoth from "mammoth";

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  _filename: string
): Promise<string | null> {
  if (mimeType === "application/pdf") {
    try {
      const pdf = await getPdfParse();
      const data = await pdf(buffer);
      return data.text ?? null;
    } catch {
      return null;
    }
  }
  if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value ?? null;
    } catch {
      return null;
    }
  }
  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }
  return null;
}
