"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { resume as resumeApi, subscription } from "@/lib/api";
import type { ResumeDraft } from "@/lib/api";

const TEMPLATES = [
  { id: "classic", name: "Classic" },
  { id: "modern", name: "Modern" },
];

export default function ResumePage() {
  const [draft, setDraft] = useState<ResumeDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [limits, setLimits] = useState<{ canExportResume: boolean; canUseJobFeature: boolean } | null>(null);

  useEffect(() => {
    resumeApi.getDraft().then(setDraft).catch(() => setDraft(null)).finally(() => setLoading(false));
    subscription.getLimits().then(setLimits).catch(() => setLimits(null));
  }, []);

  async function handleExport() {
    setExporting(true);
    try {
      const { url } = await resumeApi.exportPdf(selectedTemplate);
      window.open(url, "_blank");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  const hasData = draft && (draft.fullName || draft.experiences?.length || draft.skills?.length);
  if (!hasData) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Resume</h1>
        <p className="text-gray-600 mb-4">
          Fill your profile first so we can build your resume. You can answer a few questions or upload a resume.
        </p>
        <Link href="/dashboard/onboarding" className="text-blue-600 hover:underline">
          Build your profile
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Resume</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-1/2 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
            <div className="flex gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`px-4 py-2 rounded-lg border ${
                    selectedTemplate === t.id
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
          {limits && !limits.canExportResume && (
            <p className="text-sm text-amber-600">
              Free tier: resume export limit reached this month. Upgrade for unlimited exports.
            </p>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || (limits && !limits.canExportResume)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {exporting ? "Generating PDF…" : "Export PDF"}
          </button>
        </div>
        <div className="lg:w-1/2 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Preview</h2>
          <div className="text-sm text-gray-700 space-y-2">
            <p className="font-semibold text-lg">{draft.fullName || "Your Name"}</p>
            <p className="text-gray-600">
              {[draft.email, draft.phone, draft.location].filter(Boolean).join(" · ")}
            </p>
            {draft.professionTrack && (
              <p className="italic">{draft.professionTrack}</p>
            )}
            <div>
              <h3 className="font-medium mt-4">Education</h3>
              {draft.educations?.length
                ? draft.educations.map((e, i) => (
                    <p key={i}>{e.degree} — {e.institution}</p>
                  ))
                : "—"}
            </div>
            <div>
              <h3 className="font-medium mt-4">Experience</h3>
              {draft.experiences?.length
                ? draft.experiences.map((e, i) => (
                    <p key={i}>{e.role} at {e.company}</p>
                  ))
                : "—"}
            </div>
            <div>
              <h3 className="font-medium mt-4">Skills</h3>
              <p>{draft.skills?.map((s) => s.name).join(", ") || "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
