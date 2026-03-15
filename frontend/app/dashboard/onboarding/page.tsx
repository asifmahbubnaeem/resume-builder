"use client";

import { useState, useEffect, useRef } from "react";
import { conversation, upload } from "@/lib/api";
import type { ConversationStep } from "@/lib/api";

function UploadResume({ onUploaded }: { onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setErr("");
    try {
      await upload.uploadFile(file);
      onUploaded();
      setFile(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <label className="block text-sm font-medium text-gray-700 mb-2">Upload resume (PDF, DOC, or TXT)</label>
      <div className="flex gap-2 flex-wrap items-center">
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || uploading}
          className="px-3 py-2 rounded-lg bg-gray-700 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Upload & parse"}
        </button>
      </div>
      {err && <p className="text-sm text-red-600 mt-2">{err}</p>}
    </div>
  );
}

export default function OnboardingPage() {
  const [messages, setMessages] = useState<{ role: "bot" | "user"; text: string }[]>([]);
  const [step, setStep] = useState<ConversationStep | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversation.onboardingStep().then((s) => {
      setStep(s);
      if (s.message) setMessages((m) => [...m, { role: "bot", text: s.message }]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || sending || !step) return;
    setMessages((m) => [...m, { role: "user", text: value }]);
    setInput("");
    setSending(true);
    try {
      const next = await conversation.onboardingAnswer(value);
      setStep(next);
      if (next.message) setMessages((m) => [...m, { role: "bot", text: next.message }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "bot", text: "Something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Build your profile</h1>
      <p className="text-gray-600 mb-6">
        Answer a few short questions, or upload a resume (PDF, DOC, or TXT) to fill your profile automatically.
      </p>
      <UploadResume onUploaded={() => { setMessages([]); setStep(null); conversation.onboardingStep().then((s) => { setStep(s); if (s.message) setMessages((m) => [...m, { role: "bot", text: s.message }]); }); }} />
      <div className="bg-white rounded-lg border border-gray-200 p-4 min-h-[320px] flex flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto mb-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
        {step && !step.isComplete && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer…"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        )}
        {step?.isComplete && (
          <p className="text-sm text-green-600">Profile saved. You can edit details from Profile.</p>
        )}
      </div>
    </div>
  );
}
