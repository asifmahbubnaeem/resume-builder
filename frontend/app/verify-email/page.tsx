"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "@/lib/api";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await auth.verifyEmail(token);
        if (cancelled) return;
        setStatus("success");
        setMessage(res.message || "Email verified successfully. You can now log in.");
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to verify email.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {status === "success" ? "Email verified" : status === "error" ? "Verification issue" : "Verifying email"}
        </h1>
        <p className={status === "error" ? "text-red-600" : "text-gray-700"}>{message}</p>
      </div>
    </div>
  );
}

