"use client";

import { useState, useEffect } from "react";
import { jobs as jobsApi, resume as resumeApi, subscription } from "@/lib/api";
import type { JobAnalysisResponse, ResumeTemplate } from "@/lib/api";

const FALLBACK_TEMPLATES: ResumeTemplate[] = [
  { id: "classic", name: "Classic", description: "" },
  { id: "modern", name: "Modern", description: "" },
  { id: "minimal", name: "Minimal", description: "" },
  { id: "table", name: "Table", description: "" },
  { id: "bullet", name: "Bullet", description: "" },
  { id: "descriptive", name: "Descriptive", description: "" },
  { id: "multipanel", name: "Two-panel", description: "" },
];

export default function JobsPage() {
  const [url, setUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JobAnalysisResponse | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [exportingCover, setExportingCover] = useState(false);
  const [limits, setLimits] = useState<{ canUseJobFeature: boolean } | null>(null);
  const [templates, setTemplates] = useState<ResumeTemplate[]>(FALLBACK_TEMPLATES);
  const [tailoredTemplateId, setTailoredTemplateId] = useState("classic");

  useEffect(() => {
    subscription.getLimits().then((l) => setLimits(l ?? null)).catch(() => {});
    resumeApi.getTemplates().then(setTemplates).catch(() => setTemplates(FALLBACK_TEMPLATES));
  }, []);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() && !rawText.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await jobsApi.analyze({ url: url.trim() || undefined, rawText: rawText.trim() || undefined });
      setResult(res);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateCoverLetter() {
    if (!result?.jobId) return;
    setCoverLetterLoading(true);
    try {
      const { content } = await jobsApi.coverLetter(result.jobId);
      setCoverLetter(content);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate cover letter");
    } finally {
      setCoverLetterLoading(false);
    }
  }

  async function handleExportCoverLetter() {
    if (!result?.jobId || !coverLetter) return;
    setExportingCover(true);
    try {
      const { url: pdfUrl } = await jobsApi.coverLetterExport(result.jobId, coverLetter);
      window.open(pdfUrl, "_blank");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportingCover(false);
    }
  }

  async function handleTailoredResume() {
    if (!result?.jobId) return;
    try {
      const { url: pdfUrl } = await jobsApi.tailoredResume(result.jobId, tailoredTemplateId);
      window.open(pdfUrl, "_blank");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to generate tailored resume");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Job match</h1>
      <p className="text-gray-600 mb-6">
        Paste a job posting URL or the full text. We’ll show how well your profile matches and generate a tailored resume and cover letter.
      </p>
      {limits && !limits.canUseJobFeature && (
        <p className="text-sm text-amber-600 mb-4">
          Job matching and cover letters are available on the paid plan.
        </p>
      )}
      <form onSubmit={handleAnalyze} className="space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job URL (optional)</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Or paste job description</label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
            placeholder="Paste the full job posting text here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Analyze job"}
        </button>
      </form>

      {result && (
        <div className="space-y-6 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Results</h2>
          {result.roleTitle && (
            <p><strong>Role:</strong> {result.roleTitle}</p>
          )}
          <div>
            <strong>Match score:</strong> {result.matchScore}%
          </div>
          {result.matchingRequirements?.length > 0 && (
            <div>
              <strong>Matching:</strong>{" "}
              <span className="text-green-700">{result.matchingRequirements.join(", ")}</span>
            </div>
          )}
          {result.missingRequirements?.length > 0 && (
            <div>
              <strong>Missing from your profile:</strong>{" "}
              <span className="text-amber-700">{result.missingRequirements.join(", ")}</span>
              <p className="text-sm text-gray-600 mt-1">
                You can add these from your Profile so future resumes highlight them (only add real skills/experience).
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={tailoredTemplateId}
              onChange={(e) => setTailoredTemplateId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleTailoredResume}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Download tailored resume (PDF)
            </button>
            <button
              type="button"
              onClick={handleGenerateCoverLetter}
              disabled={coverLetterLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              {coverLetterLoading ? "Generating…" : "Generate cover letter"}
            </button>
          </div>
          {coverLetter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cover letter (edit if needed)</label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <button
                type="button"
                onClick={handleExportCoverLetter}
                disabled={exportingCover}
                className="mt-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {exportingCover ? "Exporting…" : "Export cover letter (PDF)"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
