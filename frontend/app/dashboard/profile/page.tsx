"use client";

import { useState, useEffect } from "react";
import { profile as profileApi, conversation } from "@/lib/api";
import type {
  ProfileResponse,
  ConversationStep,
  Education,
  Experience,
  Skill,
  Certification,
  Award,
  ProfilePayload,
} from "@/lib/api";

type Flow = "none" | "skill" | "experience";

export default function ProfilePage() {
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<Flow>("none");
  const [chatMessages, setChatMessages] = useState<{ role: "bot" | "user"; text: string }[]>([]);
  const [step, setStep] = useState<ConversationStep | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Edit state: which section is being edited (contact) or which id is being edited
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState<ProfilePayload>({});
  const [editingEducationId, setEditingEducationId] = useState<string | null>(null);
  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [editingCertId, setEditingCertId] = useState<string | null>(null);
  const [editingAwardId, setEditingAwardId] = useState<string | null>(null);
  const [addingSection, setAddingSection] = useState<
    "education" | "experience" | "skill" | "certification" | "award" | null
  >(null);

  function loadProfile() {
    profileApi.get().then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (data && editingContact) {
      setContactForm({
        fullName: data.fullName ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        location: data.location ?? "",
        links: data.links?.length ? data.links.join("\n") : undefined,
        professionTrack: data.professionTrack ?? "",
        careerObjective: data.careerObjective ?? "",
      });
    }
  }, [data, editingContact]);

  async function startFlow(f: Flow) {
    setFlow(f);
    setChatMessages([]);
    setStep(null);
    setInput("");
    if (f === "skill") {
      const s = await conversation.addSkillStep();
      setStep(s);
      if (s.message) setChatMessages((m) => [...m, { role: "bot", text: s.message }]);
    } else if (f === "experience") {
      const s = await conversation.addExperienceStep();
      setStep(s);
      if (s.message) setChatMessages((m) => [...m, { role: "bot", text: s.message }]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value || sending) return;
    setChatMessages((m) => [...m, { role: "user", text: value }]);
    setInput("");
    setSending(true);
    try {
      if (flow === "skill") {
        const next = await conversation.addSkillAnswer(value);
        setStep(next);
        if (next.message) setChatMessages((m) => [...m, { role: "bot", text: next.message }]);
        if (next.isComplete) {
          loadProfile();
          setTimeout(() => setFlow("none"), 1500);
        }
      } else if (flow === "experience") {
        const next = await conversation.addExperienceAnswer(value);
        setStep(next);
        if (next.message) setChatMessages((m) => [...m, { role: "bot", text: next.message }]);
        if (next.isComplete) {
          loadProfile();
          setTimeout(() => setFlow("none"), 1500);
        }
      }
    } catch (err) {
      setChatMessages((m) => [...m, { role: "bot", text: "Something went wrong. Try again." }]);
    } finally {
      setSending(false);
    }
  }

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    const linksStr = contactForm.links;
    const links = typeof linksStr === "string" ? linksStr.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) : undefined;
    try {
      await profileApi.update({
        fullName: contactForm.fullName || undefined,
        email: contactForm.email || undefined,
        phone: contactForm.phone || undefined,
        location: contactForm.location || undefined,
        links,
        professionTrack: contactForm.professionTrack || undefined,
        careerObjective: contactForm.careerObjective || undefined,
      });
      loadProfile();
      setEditingContact(false);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteEducation(id: string) {
    try {
      await profileApi.deleteEducation(id);
      loadProfile();
      setEditingEducationId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteExperience(id: string) {
    try {
      await profileApi.deleteExperience(id);
      loadProfile();
      setEditingExperienceId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteSkill(id: string) {
    try {
      await profileApi.deleteSkill(id);
      loadProfile();
      setEditingSkillId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteCertification(id: string) {
    try {
      await profileApi.deleteCertification(id);
      loadProfile();
      setEditingCertId(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteAward(id: string) {
    try {
      await profileApi.deleteAward(id);
      loadProfile();
      setEditingAwardId(null);
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      <p className="text-gray-600">
        Edit your profile. Add or remove contact info, education, experience, skills, certifications, and awards.
      </p>

      {/* Contact */}
      <section className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="font-medium text-gray-900">Contact</span>
          {!editingContact ? (
            <button
              type="button"
              onClick={() => setEditingContact(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Edit
            </button>
          ) : (
            <button type="button" onClick={() => setEditingContact(false)} className="text-sm text-gray-500 hover:underline">
              Cancel
            </button>
          )}
        </div>
        <div className="p-4">
          {editingContact ? (
            <form onSubmit={saveContact} className="grid gap-3 text-sm">
              <label className="grid gap-1">
                <span className="text-gray-600">Full name</span>
                <input
                  value={contactForm.fullName ?? ""}
                  onChange={(e) => setContactForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-gray-600">Email</span>
                <input
                  type="email"
                  value={contactForm.email ?? ""}
                  onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-gray-600">Phone</span>
                <input
                  value={contactForm.phone ?? ""}
                  onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-gray-600">Location</span>
                <input
                  value={contactForm.location ?? ""}
                  onChange={(e) => setContactForm((f) => ({ ...f, location: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-gray-600">Links (one per line or comma-separated)</span>
                <textarea
                  value={typeof contactForm.links === "string" ? contactForm.links : (data?.links?.join("\n") ?? "")}
                  onChange={(e) => setContactForm((f) => ({ ...f, links: e.target.value }))}
                  rows={2}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-gray-600">Profession / track</span>
                <input
                  value={contactForm.professionTrack ?? ""}
                  onChange={(e) => setContactForm((f) => ({ ...f, professionTrack: e.target.value }))}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-gray-600">Career objective</span>
                <textarea
                  value={contactForm.careerObjective ?? ""}
                  onChange={(e) => setContactForm((f) => ({ ...f, careerObjective: e.target.value }))}
                  rows={3}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. Seeking a software engineering role..."
                />
              </label>
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 w-fit">
                Save contact
              </button>
            </form>
          ) : (
            <div className="grid gap-2 text-sm">
              <p><strong>Name:</strong> {data?.fullName ?? "—"}</p>
              <p><strong>Email:</strong> {data?.email ?? "—"}</p>
              <p><strong>Phone:</strong> {data?.phone ?? "—"}</p>
              <p><strong>Location:</strong> {data?.location ?? "—"}</p>
              <p><strong>Links:</strong> {data?.links?.length ? data.links.join(", ") : "—"}</p>
              <p><strong>Track:</strong> {data?.professionTrack ?? "—"}</p>
              <p><strong>Career objective:</strong> {data?.careerObjective ?? "—"}</p>
            </div>
          )}
        </div>
      </section>

      {/* Education */}
      <Section
        title="Education"
        onAdd={() => setAddingSection(addingSection === "education" ? null : "education")}
        adding={addingSection === "education"}
      >
        {addingSection === "education" && (
          <AddEducationForm
            onSaved={() => {
              loadProfile();
              setAddingSection(null);
            }}
            onCancel={() => setAddingSection(null)}
          />
        )}
        {data?.educations?.length ? (
          <ul className="space-y-2">
            {data.educations.map((e) =>
              editingEducationId === e.id ? (
                <EditEducationForm
                  key={e.id}
                  item={e}
                  onSaved={() => {
                    loadProfile();
                    setEditingEducationId(null);
                  }}
                  onCancel={() => setEditingEducationId(null)}
                />
              ) : (
                <li key={e.id} className="flex items-start justify-between gap-2 py-1 border-b border-gray-100 last:border-0">
                  <div className="text-sm">
                    <strong>{e.degree}</strong> — {e.institution}
                    {(e.startDate || e.endDate) && (
                      <span className="text-gray-500"> ({[e.startDate, e.endDate].filter(Boolean).join(" – ")})</span>
                    )}
                    {e.gpa && <span className="text-gray-600"> · GPA: {e.gpa}</span>}
                    {e.honors && <span className="text-gray-600"> · {e.honors}</span>}
                    {e.details && <p className="text-gray-600 mt-0.5">{e.details}</p>}
                  </div>
                  <span className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => setEditingEducationId(e.id)} className="text-blue-600 text-sm hover:underline">Edit</button>
                    <button type="button" onClick={() => deleteEducation(e.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                  </span>
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No education added yet.</p>
        )}
      </Section>

      {/* Experience */}
      <Section
        title="Experience"
        onAdd={() => setAddingSection(addingSection === "experience" ? null : "experience")}
        adding={addingSection === "experience"}
      >
        {addingSection === "experience" && (
          <AddExperienceForm
            onSaved={() => {
              loadProfile();
              setAddingSection(null);
            }}
            onCancel={() => setAddingSection(null)}
          />
        )}
        {data?.experiences?.length ? (
          <ul className="space-y-3">
            {data.experiences.map((e) =>
              editingExperienceId === e.id ? (
                <EditExperienceForm
                  key={e.id}
                  item={e}
                  onSaved={() => {
                    loadProfile();
                    setEditingExperienceId(null);
                  }}
                  onCancel={() => setEditingExperienceId(null)}
                />
              ) : (
                <li key={e.id} className="flex items-start justify-between gap-2 py-1 border-b border-gray-100 last:border-0">
                  <div className="text-sm">
                    <strong>{e.role}</strong> at {e.company}
                    {(e.startDate || e.endDate) && (
                      <span className="text-gray-500"> ({[e.startDate, e.endDate].filter(Boolean).join(" – ")})</span>
                    )}
                    {e.bullets?.length ? (
                      <ul className="list-disc list-inside mt-1 text-gray-600">{e.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                    ) : null}
                  </div>
                  <span className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => setEditingExperienceId(e.id)} className="text-blue-600 text-sm hover:underline">Edit</button>
                    <button type="button" onClick={() => deleteExperience(e.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                  </span>
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No experience added yet.</p>
        )}
      </Section>

      {/* Skills */}
      <Section
        title="Skills"
        onAdd={() => setAddingSection(addingSection === "skill" ? null : "skill")}
        adding={addingSection === "skill"}
      >
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => startFlow("skill")}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            Add skill (chat)
          </button>
        </div>
        {addingSection === "skill" && (
          <AddSkillForm
            onSaved={() => {
              loadProfile();
              setAddingSection(null);
            }}
            onCancel={() => setAddingSection(null)}
          />
        )}
        {data?.skills?.length ? (
          <ul className="space-y-1">
            {data.skills.map((s) =>
              editingSkillId === s.id ? (
                <EditSkillForm
                  key={s.id}
                  item={s}
                  onSaved={() => {
                    loadProfile();
                    setEditingSkillId(null);
                  }}
                  onCancel={() => setEditingSkillId(null)}
                />
              ) : (
                <li key={s.id} className="flex items-center justify-between py-0.5">
                  <span className="text-sm">{s.name}{s.category ? ` (${s.category})` : ""}</span>
                  <span className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => setEditingSkillId(s.id)} className="text-blue-600 text-sm hover:underline">Edit</button>
                    <button type="button" onClick={() => deleteSkill(s.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                  </span>
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No skills added yet. Duplicate skills are not added.</p>
        )}
      </Section>

      {/* Certifications */}
      <Section
        title="Certifications"
        onAdd={() => setAddingSection(addingSection === "certification" ? null : "certification")}
        adding={addingSection === "certification"}
      >
        {addingSection === "certification" && (
          <AddCertificationForm
            onSaved={() => {
              loadProfile();
              setAddingSection(null);
            }}
            onCancel={() => setAddingSection(null)}
          />
        )}
        {(data?.certifications ?? []).length > 0 ? (
          <ul className="space-y-2">
            {(data?.certifications ?? []).map((c) =>
              editingCertId === c.id ? (
                <EditCertificationForm
                  key={c.id}
                  item={c}
                  onSaved={() => {
                    loadProfile();
                    setEditingCertId(null);
                  }}
                  onCancel={() => setEditingCertId(null)}
                />
              ) : (
                <li key={c.id} className="flex items-start justify-between gap-2 py-1 border-b border-gray-100 last:border-0">
                  <div className="text-sm">
                    <strong>{c.name}</strong>
                    {c.issuer && ` — ${c.issuer}`}
                    {c.date && ` (${c.date})`}
                    {c.url && <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 ml-1">Link</a>}
                  </div>
                  <span className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => setEditingCertId(c.id)} className="text-blue-600 text-sm hover:underline">Edit</button>
                    <button type="button" onClick={() => deleteCertification(c.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                  </span>
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No certifications added yet.</p>
        )}
      </Section>

      {/* Awards */}
      <Section
        title="Awards"
        onAdd={() => setAddingSection(addingSection === "award" ? null : "award")}
        adding={addingSection === "award"}
      >
        {addingSection === "award" && (
          <AddAwardForm
            onSaved={() => {
              loadProfile();
              setAddingSection(null);
            }}
            onCancel={() => setAddingSection(null)}
          />
        )}
        {(data?.awards ?? []).length > 0 ? (
          <ul className="space-y-2">
            {(data?.awards ?? []).map((a) =>
              editingAwardId === a.id ? (
                <EditAwardForm
                  key={a.id}
                  item={a}
                  onSaved={() => {
                    loadProfile();
                    setEditingAwardId(null);
                  }}
                  onCancel={() => setEditingAwardId(null)}
                />
              ) : (
                <li key={a.id} className="flex items-start justify-between gap-2 py-1 border-b border-gray-100 last:border-0">
                  <div className="text-sm">
                    <strong>{a.title}</strong>
                    {a.issuer && ` — ${a.issuer}`}
                    {a.date && ` (${a.date})`}
                    {a.description && <p className="text-gray-600 mt-0.5">{a.description}</p>}
                  </div>
                  <span className="flex gap-1 shrink-0">
                    <button type="button" onClick={() => setEditingAwardId(a.id)} className="text-blue-600 text-sm hover:underline">Edit</button>
                    <button type="button" onClick={() => deleteAward(a.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                  </span>
                </li>
              )
            )}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No awards added yet.</p>
        )}
      </Section>

      {/* Chat flow for add skill / add experience */}
      {flow !== "none" && (
        <div className="mb-8 bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-2">
            {flow === "skill" ? "Add skill" : "Add experience"}
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            {flow === "skill" ? "Same skill won't be added twice." : "Same job title + company will update that entry instead of creating a new one."}
          </p>
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          {step && !step.isComplete && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your answer…"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={sending}
              />
              <button type="submit" disabled={sending} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">
                Send
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  onAdd,
  adding,
}: {
  title: string;
  children: React.ReactNode;
  onAdd: () => void;
  adding: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="font-medium text-gray-900">{title}</span>
        <button type="button" onClick={onAdd} className="text-sm text-blue-600 hover:underline">
          {adding ? "Cancel" : "Add"}
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function AddEducationForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [details, setDetails] = useState("");
  const [gpa, setGpa] = useState("");
  const [honors, setHonors] = useState("");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!degree.trim()) return;
    setSaving(true);
    try {
      await profileApi.addEducation({
        degree: degree.trim(),
        institution: institution.trim(),
        startDate: startDate.trim() || undefined,
        endDate: endDate.trim() || undefined,
        details: details.trim() || undefined,
        gpa: gpa.trim() || undefined,
        honors: honors.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
      <input placeholder="Degree" value={degree} onChange={(e) => setDegree(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      <input placeholder="Institution" value={institution} onChange={(e) => setInstitution(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
      <div className="flex gap-2">
        <input placeholder="Start (e.g. 2018)" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
        <input placeholder="End (e.g. 2022)" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
      </div>
      <input placeholder="GPA (e.g. 3.8/4.0)" value={gpa} onChange={(e) => setGpa(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
      <input placeholder="Honors (e.g. Summa Cum Laude)" value={honors} onChange={(e) => setHonors(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
      <textarea placeholder="Details" value={details} onChange={(e) => setDetails(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={2} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

function EditEducationForm({ item, onSaved, onCancel }: { item: Education; onSaved: () => void; onCancel: () => void }) {
  const [degree, setDegree] = useState(item.degree);
  const [institution, setInstitution] = useState(item.institution);
  const [startDate, setStartDate] = useState(item.startDate ?? "");
  const [endDate, setEndDate] = useState(item.endDate ?? "");
  const [details, setDetails] = useState(item.details ?? "");
  const [gpa, setGpa] = useState(item.gpa ?? "");
  const [honors, setHonors] = useState(item.honors ?? "");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileApi.patchEducation(item.id, {
        degree: degree.trim(),
        institution: institution.trim(),
        startDate: startDate.trim() || null,
        endDate: endDate.trim() || null,
        details: details.trim() || null,
        gpa: gpa.trim() || null,
        honors: honors.trim() || null,
      });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-2 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
      <input value={degree} onChange={(e) => setDegree(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      <input value={institution} onChange={(e) => setInstitution(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
      <div className="flex gap-2">
        <input value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" placeholder="Start" />
        <input value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" placeholder="End" />
      </div>
      <input value={gpa} onChange={(e) => setGpa(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="GPA" />
      <input value={honors} onChange={(e) => setHonors(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Honors" />
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={2} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

function AddExperienceForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bulletsStr, setBulletsStr] = useState("");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim() || !company.trim()) return;
    setSaving(true);
    try {
      const bullets = bulletsStr.split(/\n/).map((s) => s.trim()).filter(Boolean);
      await profileApi.addExperience({ role: role.trim(), company: company.trim(), startDate: startDate.trim() || undefined, endDate: endDate.trim() || undefined, bullets });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
      <input placeholder="Job title" value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      <input placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      <div className="flex gap-2">
        <input placeholder="Start" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
        <input placeholder="End" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" />
      </div>
      <textarea placeholder="Bullet points (one per line)" value={bulletsStr} onChange={(e) => setBulletsStr(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={3} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

function EditExperienceForm({ item, onSaved, onCancel }: { item: Experience; onSaved: () => void; onCancel: () => void }) {
  const [role, setRole] = useState(item.role);
  const [company, setCompany] = useState(item.company);
  const [startDate, setStartDate] = useState(item.startDate ?? "");
  const [endDate, setEndDate] = useState(item.endDate ?? "");
  const [bulletsStr, setBulletsStr] = useState((item.bullets ?? []).join("\n"));
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const bullets = bulletsStr.split(/\n/).map((s) => s.trim()).filter(Boolean);
      await profileApi.patchExperience(item.id, { role: role.trim(), company: company.trim(), startDate: startDate.trim() || null, endDate: endDate.trim() || null, bullets });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-2 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
      <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      <div className="flex gap-2">
        <input value={startDate} onChange={(e) => setStartDate(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" placeholder="Start" />
        <input value={endDate} onChange={(e) => setEndDate(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg" placeholder="End" />
      </div>
      <textarea value={bulletsStr} onChange={(e) => setBulletsStr(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="Bullets (one per line)" />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

function AddSkillForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await profileApi.addSkill({ name: name.trim(), category: category.trim() || undefined });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-4 p-3 bg-gray-50 rounded-lg flex flex-wrap gap-2 text-sm items-end">
      <input placeholder="Skill name" value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-2 border rounded-lg" required />
      <input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border rounded-lg" />
      <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Add</button>
      <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
    </form>
  );
}

function EditSkillForm({ item, onSaved, onCancel }: { item: Skill; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category ?? "");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileApi.patchSkill(item.id, { name: name.trim(), category: category.trim() || null });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-2 p-3 bg-gray-50 rounded-lg flex flex-wrap gap-2 text-sm items-end">
      <input value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-2 border rounded-lg" required />
      <input value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border rounded-lg" placeholder="Category" />
      <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
      <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
    </form>
  );
}

function AddCertificationForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [date, setDate] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await profileApi.addCertification({ name: name.trim(), issuer: issuer.trim() || undefined, date: date.trim() || undefined, url: url.trim() || undefined });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
      <input placeholder="Certification name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      <input placeholder="Issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
      <input placeholder="Date (e.g. 2023)" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
      <input placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full px-3 py-2 border rounded-lg" type="url" />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

function EditCertificationForm({ item, onSaved, onCancel }: { item: Certification; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(item.name);
  const [issuer, setIssuer] = useState(item.issuer ?? "");
  const [date, setDate] = useState(item.date ?? "");
  const [url, setUrl] = useState(item.url ?? "");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileApi.patchCertification(item.id, { name: name.trim(), issuer: issuer.trim() || null, date: date.trim() || null, url: url.trim() || null });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-2 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      <input value={issuer} onChange={(e) => setIssuer(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Issuer" />
      <input value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Date" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="URL" type="url" />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

function AddAwardForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [issuer, setIssuer] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await profileApi.addAward({ title: title.trim(), issuer: issuer.trim() || undefined, date: date.trim() || undefined, description: description.trim() || undefined });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
      <input placeholder="Award title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      <input placeholder="Issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
      <input placeholder="Date (e.g. 2023)" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
      <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg" rows={2} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

function EditAwardForm({ item, onSaved, onCancel }: { item: Award; onSaved: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(item.title);
  const [issuer, setIssuer] = useState(item.issuer ?? "");
  const [date, setDate] = useState(item.date ?? "");
  const [description, setDescription] = useState(item.description ?? "");
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await profileApi.patchAward(item.id, { title: title.trim(), issuer: issuer.trim() || null, date: date.trim() || null, description: description.trim() || null });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="mb-2 p-3 bg-gray-50 rounded-lg space-y-2 text-sm">
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg" required />
      <input value={issuer} onChange={(e) => setIssuer(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Issuer" />
      <input value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Date" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Description" rows={2} />
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Save</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}
