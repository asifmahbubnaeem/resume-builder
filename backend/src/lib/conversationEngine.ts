import { prisma } from "./prisma.js";

type OnboardingStepId =
  | "fullName"
  | "email"
  | "phone"
  | "location"
  | "links"
  | "professionTrack"
  | "education"
  | "experience"
  | "skills"
  | "done";

const ONBOARDING_ORDER: OnboardingStepId[] = [
  "fullName",
  "email",
  "phone",
  "location",
  "links",
  "professionTrack",
  "education",
  "experience",
  "skills",
  "done",
];

const STEP_PROMPTS: Record<OnboardingStepId, string> = {
  fullName: "What's your full name?",
  email: "What's your email address?",
  phone: "What's the best phone number to reach you?",
  location: "Where are you located? (city, country or time zone)",
  links: "Share any profile links (LinkedIn, portfolio, etc.) — one per line or comma-separated.",
  professionTrack: "What's your target profession or track? (e.g. Test Engineer, Software Developer)",
  education: "Tell me about your education: degree and institution (e.g. B.S. Computer Science, MIT). You can add more later.",
  experience: "Tell me about one role: job title and company (e.g. QA Engineer at Acme). We'll add more in a moment.",
  skills: "List 3–5 key skills, comma-separated (e.g. Python, manual testing, Selenium).",
  done: "You're all set! Your profile is saved.",
};

export interface ConversationStep {
  stepId: string;
  message: string;
  isComplete?: boolean;
  next?: string | null;
}

async function getOrCreateProfile(userId: string) {
  return prisma.profile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function getNextOnboardingStep(userId: string): Promise<ConversationStep> {
  const profile = await getOrCreateProfile(userId);
  const hasName = !!profile.fullName?.trim();
  const hasEmail = !!profile.email?.trim();
  const hasPhone = profile.phone !== null && profile.phone !== undefined;
  const hasLocation = profile.location !== null && profile.location !== undefined;
  const hasLinks = profile.links.length > 0;
  const hasTrack = !!profile.professionTrack?.trim();
  const eduCount = await prisma.education.count({ where: { profileId: profile.id } });
  const expCount = await prisma.experience.count({ where: { profileId: profile.id } });
  const skillCount = await prisma.skill.count({ where: { profileId: profile.id } });

  const progress = {
    fullName: hasName,
    email: hasEmail,
    phone: hasPhone,
    location: hasLocation,
    links: hasLinks,
    professionTrack: hasTrack,
    education: eduCount > 0,
    experience: expCount > 0,
    skills: skillCount > 0,
  };

  for (const step of ONBOARDING_ORDER) {
    if (step === "done") {
      return { stepId: "done", message: STEP_PROMPTS.done, isComplete: true, next: null };
    }
    if (!progress[step as keyof typeof progress]) {
      return {
        stepId: step,
        message: STEP_PROMPTS[step as OnboardingStepId],
        isComplete: false,
        next: step,
      };
    }
  }
  return { stepId: "done", message: STEP_PROMPTS.done, isComplete: true, next: null };
}

export async function submitOnboardingAnswer(userId: string, answer: string): Promise<ConversationStep> {
  const profile = await getOrCreateProfile(userId);
  const step = await getNextOnboardingStep(userId);
  if (step.stepId === "done") return step;

  const value = answer.trim();
  switch (step.stepId) {
    case "fullName":
      await prisma.profile.update({ where: { id: profile.id }, data: { fullName: value } });
      break;
    case "email":
      await prisma.profile.update({ where: { id: profile.id }, data: { email: value } });
      break;
    case "phone":
      await prisma.profile.update({ where: { id: profile.id }, data: { phone: value } });
      break;
    case "location":
      await prisma.profile.update({ where: { id: profile.id }, data: { location: value } });
      break;
    case "links":
      const links = value.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
      await prisma.profile.update({ where: { id: profile.id }, data: { links } });
      break;
    case "professionTrack":
      await prisma.profile.update({ where: { id: profile.id }, data: { professionTrack: value } });
      break;
    case "education": {
      const parts = value.split(/,| at |@/).map((s) => s.trim());
      const degree = parts[0] ?? value;
      const institution = parts[1] ?? "";
      const count = await prisma.education.count({ where: { profileId: profile.id } });
      await prisma.education.create({
        data: { profileId: profile.id, degree, institution, orderIndex: count },
      });
      break;
    }
    case "experience": {
      const parts = value.split(/,| at /).map((s) => s.trim());
      const role = parts[0] ?? value;
      const company = parts[1] ?? "";
      const count = await prisma.experience.count({ where: { profileId: profile.id } });
      await prisma.experience.create({
        data: { profileId: profile.id, role, company, bullets: [], orderIndex: count },
      });
      break;
    }
    case "skills": {
      const names = value.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      const existingSkills = await prisma.skill.findMany({ where: { profileId: profile.id }, select: { name: true } });
      const existingSet = new Set(existingSkills.map((s) => s.name.toLowerCase()));
      const toAdd = names.filter((n) => !existingSet.has(n.toLowerCase()));
      const count = await prisma.skill.count({ where: { profileId: profile.id } });
      for (let i = 0; i < toAdd.length; i++) {
        await prisma.skill.create({
          data: { profileId: profile.id, name: toAdd[i], orderIndex: count + i },
        });
      }
      break;
    }
  }
  return getNextOnboardingStep(userId);
}

// Add-skill flow: single skill name (and optional category)
const ADD_SKILL_STEPS = ["name", "done"] as const;
export async function getNextAddSkillStep(userId: string): Promise<ConversationStep> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return { stepId: "name", message: "What skill would you like to add?", next: "name" };
  return { stepId: "name", message: "What skill would you like to add? (e.g. Selenium, Python)", next: "name" };
}

export async function submitAddSkillAnswer(userId: string, answer: string): Promise<ConversationStep> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return { stepId: "done", message: "Please complete onboarding first.", isComplete: true };
  const name = answer.trim();
  if (!name) return { stepId: "name", message: "Please enter a skill name.", next: "name" };
  const existing = await prisma.skill.findFirst({
    where: { profileId: profile.id, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    return { stepId: "done", message: `"${name}" is already in your skills.`, isComplete: true, next: null };
  }
  const count = await prisma.skill.count({ where: { profileId: profile.id } });
  await prisma.skill.create({ data: { profileId: profile.id, name, orderIndex: count } });
  return { stepId: "done", message: `Added "${name}" to your profile.`, isComplete: true, next: null };
}

// Add-experience flow: role, company, then optional bullets
const ADD_EXP_STEPS = ["role", "company", "bullets", "done"] as const;
let addExpState: Record<string, { role?: string; company?: string }> = {};

export async function getNextAddExperienceStep(userId: string): Promise<ConversationStep> {
  const state = addExpState[userId];
  if (!state) return { stepId: "role", message: "What's the job title for this experience?", next: "role" };
  if (!state.role) return { stepId: "role", message: "What's the job title?", next: "role" };
  if (!state.company) return { stepId: "company", message: "Which company?", next: "company" };
  return { stepId: "bullets", message: "Add 1–3 bullet points (one per line), or type 'skip'.", next: "bullets" };
}

export async function submitAddExperienceAnswer(userId: string, answer: string): Promise<ConversationStep> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return { stepId: "done", message: "Complete onboarding first.", isComplete: true };
  let state = addExpState[userId] ?? {};

  if (!state.role) {
    state.role = answer.trim();
    addExpState[userId] = state;
    return { stepId: "company", message: "Which company?", next: "company" };
  }
  if (!state.company) {
    state.company = answer.trim();
    addExpState[userId] = state;
    return { stepId: "bullets", message: "Add 1–3 bullet points (one per line), or type 'skip'.", next: "bullets" };
  }
  const bullets = answer.trim().toLowerCase() === "skip" ? [] : answer.split(/\n/).map((s) => s.trim()).filter(Boolean);
  const existing = await prisma.experience.findFirst({
    where: {
      profileId: profile.id,
      role: { equals: state.role, mode: "insensitive" },
      company: { equals: state.company, mode: "insensitive" },
    },
  });
  if (existing) {
    const mergedBullets = [...new Set([...existing.bullets, ...bullets])];
    await prisma.experience.update({
      where: { id: existing.id },
      data: { bullets: mergedBullets },
    });
    delete addExpState[userId];
    return { stepId: "done", message: `Updated ${state.role} at ${state.company} with new bullet points.`, isComplete: true, next: null };
  }
  const count = await prisma.experience.count({ where: { profileId: profile.id } });
  await prisma.experience.create({
    data: {
      profileId: profile.id,
      role: state.role,
      company: state.company,
      bullets,
      orderIndex: count,
    },
  });
  delete addExpState[userId];
  return { stepId: "done", message: `Added ${state.role} at ${state.company}.`, isComplete: true, next: null };
}
