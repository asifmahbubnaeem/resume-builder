"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

export default function HomePage() {
  const { user, token } = useAuth();

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Builder</h1>
        <p className="text-gray-600 mb-8">Build and tailor your resume with AI</p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="px-6 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          >
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Builder</h1>
      <p className="text-gray-600 mb-8">Welcome, {user?.email}</p>
      <Link
        href="/dashboard"
        className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
