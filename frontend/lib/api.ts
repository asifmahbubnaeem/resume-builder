const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function api<T>(
  path: string,
  options: RequestInit & { body?: unknown } = {}
): Promise<T> {
  const { body, ...rest } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...((rest.headers as Record<string, string>) ?? {}),
  };
  const token = getToken();
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? "Request failed");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const auth = {
  register: (email: string, password: string) =>
    api<{ user: { id: string; email: string; subscription: string }; token: string }>("/api/auth/register", {
      method: "POST",
      body: { email, password },
    }),
  login: (email: string, password: string) =>
    api<{ user: { id: string; email: string; subscription: string }; token: string }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () =>
    api<{ id: string; email: string; subscription: string; profile?: unknown }>("/api/auth/me"),
};

export const profile = {
  get: () => api<ProfileResponse | null>("/api/profile"),
  update: (data: Partial<ProfilePayload>) =>
    api<ProfileResponse>("/api/profile", { method: "PUT", body: data }),
  getEducations: () => api<Education[]>("/api/profile/educations"),
  addEducation: (data: { degree: string; institution: string; startDate?: string; endDate?: string; details?: string; gpa?: string; honors?: string }) =>
    api<Education>("/api/profile/educations", { method: "POST", body: data }),
  patchEducation: (id: string, data: Partial<Education>) =>
    api<Education>(`/api/profile/educations/${id}`, { method: "PATCH", body: data }),
  deleteEducation: (id: string) =>
    api<void>(`/api/profile/educations/${id}`, { method: "DELETE" }),
  getExperiences: () => api<Experience[]>("/api/profile/experiences"),
  addExperience: (data: { role: string; company: string; startDate?: string; endDate?: string; bullets?: string[] }) =>
    api<Experience>("/api/profile/experiences", { method: "POST", body: data }),
  patchExperience: (id: string, data: Partial<Experience>) =>
    api<Experience>(`/api/profile/experiences/${id}`, { method: "PATCH", body: data }),
  deleteExperience: (id: string) =>
    api<void>(`/api/profile/experiences/${id}`, { method: "DELETE" }),
  getSkills: () => api<Skill[]>("/api/profile/skills"),
  addSkill: (data: { name: string; category?: string }) =>
    api<Skill>("/api/profile/skills", { method: "POST", body: data }),
  patchSkill: (id: string, data: Partial<Skill>) =>
    api<Skill>(`/api/profile/skills/${id}`, { method: "PATCH", body: data }),
  deleteSkill: (id: string) =>
    api<void>(`/api/profile/skills/${id}`, { method: "DELETE" }),
  getCertifications: () => api<Certification[]>("/api/profile/certifications"),
  addCertification: (data: { name: string; issuer?: string; date?: string; url?: string }) =>
    api<Certification>("/api/profile/certifications", { method: "POST", body: data }),
  patchCertification: (id: string, data: Partial<Certification>) =>
    api<Certification>(`/api/profile/certifications/${id}`, { method: "PATCH", body: data }),
  deleteCertification: (id: string) =>
    api<void>(`/api/profile/certifications/${id}`, { method: "DELETE" }),
  getAwards: () => api<Award[]>("/api/profile/awards"),
  addAward: (data: { title: string; issuer?: string; date?: string; description?: string }) =>
    api<Award>("/api/profile/awards", { method: "POST", body: data }),
  patchAward: (id: string, data: Partial<Award>) =>
    api<Award>(`/api/profile/awards/${id}`, { method: "PATCH", body: data }),
  deleteAward: (id: string) =>
    api<void>(`/api/profile/awards/${id}`, { method: "DELETE" }),
};

export const resume = {
  getDraft: () => api<ResumeDraft>("/api/resume/draft"),
  exportPdf: (templateId: string) =>
    api<{ url: string }>("/api/resume/export", { method: "POST", body: { templateId } }),
};

export const upload = {
  uploadFile: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const token = getToken();
    return fetch(`${API_URL}/api/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    }).then(async (res) => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Upload failed");
      }
      return res.json() as Promise<{ extractedText?: string; parsed?: boolean; message?: string }>;
    });
  },
};

export const jobs = {
  analyze: (params: { url?: string; rawText?: string }) =>
    api<JobAnalysisResponse>("/api/jobs/analyze", { method: "POST", body: params }),
  tailoredResume: (jobId: string, templateId: string) =>
    api<{ url: string }>(`/api/jobs/${jobId}/tailored-resume`, {
      method: "POST",
      body: { templateId },
    }),
  coverLetter: (jobId: string) =>
    api<{ content: string }>(`/api/jobs/${jobId}/cover-letter`, { method: "POST" }),
  coverLetterExport: (jobId: string, content: string) =>
    api<{ url: string }>(`/api/jobs/${jobId}/cover-letter/export`, {
      method: "POST",
      body: { content },
    }),
};

export const conversation = {
  onboardingStep: () => api<ConversationStep>("/api/conversation/onboarding/step"),
  onboardingAnswer: (answer: string) =>
    api<ConversationStep>("/api/conversation/onboarding/answer", {
      method: "POST",
      body: { answer },
    }),
  addSkillStep: () => api<ConversationStep>("/api/conversation/add-skill/step"),
  addSkillAnswer: (answer: string) =>
    api<ConversationStep>("/api/conversation/add-skill/answer", {
      method: "POST",
      body: { answer },
    }),
  addExperienceStep: () => api<ConversationStep>("/api/conversation/add-experience/step"),
  addExperienceAnswer: (answer: string) =>
    api<ConversationStep>("/api/conversation/add-experience/answer", {
      method: "POST",
      body: { answer },
    }),
};

export const subscription = {
  getLimits: () =>
    api<{ canExportResume: boolean; canUseJobFeature: boolean }>("/api/subscription/limits"),
  upgrade: () =>
    api<{ subscription: string }>("/api/subscription/upgrade", { method: "POST" }),
};

export interface ConversationStep {
  stepId: string;
  message: string;
  isComplete?: boolean;
  next?: string | null;
}

export interface ProfileResponse {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: string[];
  professionTrack: string | null;
  educations: Education[];
  experiences: Experience[];
  skills: Skill[];
  certifications: Certification[];
  awards: Award[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string | null;
  date: string | null;
  url: string | null;
}

export interface Award {
  id: string;
  title: string;
  issuer: string | null;
  date: string | null;
  description: string | null;
}

export interface ProfilePayload {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: string[];
  professionTrack?: string;
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  startDate: string | null;
  endDate: string | null;
  details: string | null;
  gpa: string | null;
  honors: string | null;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  startDate: string | null;
  endDate: string | null;
  bullets: string[];
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
}

export interface ResumeDraft {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: string[];
  professionTrack: string | null;
  educations: Array<{ degree: string; institution: string; startDate: string | null; endDate: string | null; details: string | null; gpa: string | null; honors: string | null }>;
  experiences: Array<{ role: string; company: string; startDate: string | null; endDate: string | null; bullets: string[] }>;
  skills: Array<{ name: string; category: string | null }>;
  certifications: Array<{ name: string; issuer: string | null; date: string | null; url: string | null }>;
  awards: Array<{ title: string; issuer: string | null; date: string | null; description: string | null }>;
}

export interface JobAnalysisResponse {
  jobId: string;
  roleTitle?: string;
  requirements: string[];
  matchScore: number;
  missingRequirements: string[];
  matchingRequirements: string[];
}
