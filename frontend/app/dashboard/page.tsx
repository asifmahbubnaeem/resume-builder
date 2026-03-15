"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { subscription } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();

  async function handleUpgrade() {
    try {
      await subscription.upgrade();
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upgrade failed");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      {user?.subscription === "free" && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
          <span className="text-amber-800 text-sm">Free tier: 2 resume exports/month; job matching is paid.</span>
          <button type="button" onClick={handleUpgrade} className="px-3 py-1 rounded bg-amber-600 text-white text-sm hover:bg-amber-700">Upgrade (test)</button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/onboarding"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow"
        >
          <h2 className="font-semibold text-gray-900">Build your profile</h2>
          <p className="text-sm text-gray-600 mt-1">
            Answer a few questions or upload your resume to fill your knowledge base.
          </p>
        </Link>
        <Link
          href="/dashboard/resume"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow"
        >
          <h2 className="font-semibold text-gray-900">Resume</h2>
          <p className="text-sm text-gray-600 mt-1">
            Preview your resume, pick a template, and export PDF.
          </p>
        </Link>
        <Link
          href="/dashboard/jobs"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow"
        >
          <h2 className="font-semibold text-gray-900">Job match</h2>
          <p className="text-sm text-gray-600 mt-1">
            Paste a job posting to see match score, get a tailored resume and cover letter.
          </p>
        </Link>
        <Link
          href="/dashboard/profile"
          className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow"
        >
          <h2 className="font-semibold text-gray-900">Edit profile</h2>
          <p className="text-sm text-gray-600 mt-1">
            Add skills, experience, or education.
          </p>
        </Link>
      </div>
    </div>
  );
}
