"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAuth();

  if (!token) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex gap-6">
          <Link
            href="/dashboard"
            className={pathname === "/dashboard" ? "font-medium text-blue-600" : "text-gray-700 hover:text-blue-600"}
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/onboarding"
            className={pathname === "/dashboard/onboarding" ? "font-medium text-blue-600" : "text-gray-700 hover:text-blue-600"}
          >
            Build profile
          </Link>
          <Link
            href="/dashboard/resume"
            className={pathname === "/dashboard/resume" ? "font-medium text-blue-600" : "text-gray-700 hover:text-blue-600"}
          >
            Resume
          </Link>
          <Link
            href="/dashboard/jobs"
            className={pathname === "/dashboard/jobs" ? "font-medium text-blue-600" : "text-gray-700 hover:text-blue-600"}
          >
            Job match
          </Link>
          <Link
            href="/dashboard/profile"
            className={pathname === "/dashboard/profile" ? "font-medium text-blue-600" : "text-gray-700 hover:text-blue-600"}
          >
            Profile
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            type="button"
            onClick={() => { logout(); router.push("/"); }}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Log out
          </button>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
