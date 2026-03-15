import { prisma } from "./prisma.js";

export interface ResumeData {
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
  /** For tailored resume: reorder/emphasize by job requirements */
  jobRequirementIds?: string[];
}

export async function getProfileForResume(
  userId: string,
  jobRequirementKeywords?: string[]
): Promise<ResumeData> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      educations: { orderBy: { orderIndex: "asc" } },
      experiences: { orderBy: { orderIndex: "asc" } },
      skills: { orderBy: { orderIndex: "asc" } },
      certifications: { orderBy: { orderIndex: "asc" } },
      awards: { orderBy: { orderIndex: "asc" } },
    },
  });
  if (!profile) {
    return {
      fullName: null,
      email: null,
      phone: null,
      location: null,
      links: [],
      professionTrack: null,
      educations: [],
      experiences: [],
      skills: [],
      certifications: [],
      awards: [],
    };
  }

  let skills = profile.skills.map((s) => ({ name: s.name, category: s.category }));
  let experiences = profile.experiences.map((e) => ({
    role: e.role,
    company: e.company,
    startDate: e.startDate,
    endDate: e.endDate,
    bullets: e.bullets,
  }));

  if (jobRequirementKeywords?.length) {
    const lower = jobRequirementKeywords.map((k) => k.toLowerCase());
    skills = [...skills].sort((a, b) => {
      const aMatch = lower.some((k) => a.name.toLowerCase().includes(k));
      const bMatch = lower.some((k) => b.name.toLowerCase().includes(k));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
    experiences = [...experiences].sort((a, b) => {
      const aMatch = lower.some((k) => a.role.toLowerCase().includes(k) || a.company.toLowerCase().includes(k) || a.bullets.some((bl) => bl.toLowerCase().includes(k)));
      const bMatch = lower.some((k) => b.role.toLowerCase().includes(k) || b.company.toLowerCase().includes(k) || b.bullets.some((bl) => bl.toLowerCase().includes(k)));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }

  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    links: profile.links,
    professionTrack: profile.professionTrack,
    educations: profile.educations.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      startDate: e.startDate,
      endDate: e.endDate,
      details: e.details,
      gpa: e.gpa,
      honors: e.honors,
    })),
    experiences,
    skills,
    certifications: profile.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.date,
      url: c.url,
    })),
    awards: profile.awards.map((a) => ({
      title: a.title,
      issuer: a.issuer,
      date: a.date,
      description: a.description,
    })),
  };
}
