import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, type AuthRequest } from "../middleware/auth.js";

export const profileRouter = Router();

profileRouter.use(authMiddleware);

profileRouter.get("/", async (req: AuthRequest, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user!.userId },
      include: { educations: true, experiences: true, skills: true, certifications: true, awards: true },
    });
    res.json(profile ?? null);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

profileRouter.put("/", async (req: AuthRequest, res) => {
  try {
    const body = req.body as {
      fullName?: string;
      email?: string;
      phone?: string;
      location?: string;
      links?: string[];
      professionTrack?: string;
      careerObjective?: string;
    };
    const profile = await prisma.profile.upsert({
      where: { userId: req.user!.userId },
      create: {
        userId: req.user!.userId,
        fullName: body.fullName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        location: body.location ?? null,
        links: body.links ?? [],
        professionTrack: body.professionTrack ?? null,
        careerObjective: body.careerObjective ?? null,
      },
      update: {
        ...(body.fullName !== undefined && { fullName: body.fullName }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.links !== undefined && { links: body.links }),
        ...(body.professionTrack !== undefined && { professionTrack: body.professionTrack }),
        ...(body.careerObjective !== undefined && { careerObjective: body.careerObjective }),
      },
      include: { educations: true, experiences: true, skills: true, certifications: true, awards: true },
    });
    res.json(profile);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Education CRUD
profileRouter.get("/educations", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.json([]);
  const list = await prisma.education.findMany({ where: { profileId: profile.id }, orderBy: { orderIndex: "asc" } });
  res.json(list);
});

profileRouter.post("/educations", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const { degree, institution, startDate, endDate, details, gpa, honors } = req.body;
  const count = await prisma.education.count({ where: { profileId: profile.id } });
  const edu = await prisma.education.create({
    data: {
      profileId: profile.id,
      degree: degree ?? "",
      institution: institution ?? "",
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      details: details ?? null,
      gpa: gpa ?? null,
      honors: honors ?? null,
      orderIndex: count,
    },
  });
  res.status(201).json(edu);
});

profileRouter.patch("/educations/:id", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const id = req.params.id;
  const body = req.body as { degree?: string; institution?: string; startDate?: string; endDate?: string; details?: string; gpa?: string; honors?: string; orderIndex?: number };
  const edu = await prisma.education.updateMany({
    where: { id, profileId: profile.id },
    data: body,
  });
  if (edu.count === 0) return res.status(404).json({ error: "Education not found" });
  const updated = await prisma.education.findUnique({ where: { id } });
  res.json(updated);
});

profileRouter.delete("/educations/:id", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const deleted = await prisma.education.deleteMany({ where: { id: req.params.id, profileId: profile.id } });
  if (deleted.count === 0) return res.status(404).json({ error: "Education not found" });
  res.status(204).send();
});

// Experience CRUD
profileRouter.get("/experiences", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.json([]);
  const list = await prisma.experience.findMany({ where: { profileId: profile.id }, orderBy: { orderIndex: "asc" } });
  res.json(list);
});

profileRouter.post("/experiences", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const { role, company, startDate, endDate, bullets } = req.body as { role?: string; company?: string; startDate?: string; endDate?: string; bullets?: string[] };
  const existing = await prisma.experience.findFirst({
    where: {
      profileId: profile.id,
      role: { equals: role ?? "", mode: "insensitive" },
      company: { equals: company ?? "", mode: "insensitive" },
    },
  });
  const newBullets = Array.isArray(bullets) ? bullets : [];
  if (existing) {
    const mergedBullets = [...new Set([...existing.bullets, ...newBullets])];
    const exp = await prisma.experience.update({
      where: { id: existing.id },
      data: {
        startDate: startDate ?? existing.startDate,
        endDate: endDate ?? existing.endDate,
        bullets: mergedBullets.length ? mergedBullets : existing.bullets,
      },
    });
    return res.json(exp);
  }
  const count = await prisma.experience.count({ where: { profileId: profile.id } });
  const exp = await prisma.experience.create({
    data: {
      profileId: profile.id,
      role: role ?? "",
      company: company ?? "",
      startDate: startDate ?? null,
      endDate: endDate ?? null,
      bullets: newBullets,
      orderIndex: count,
    },
  });
  res.status(201).json(exp);
});

profileRouter.patch("/experiences/:id", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const id = req.params.id;
  const body = req.body as { role?: string; company?: string; startDate?: string; endDate?: string; bullets?: string[]; orderIndex?: number };
  await prisma.experience.updateMany({ where: { id, profileId: profile.id }, data: body });
  const updated = await prisma.experience.findUnique({ where: { id } });
  if (!updated) return res.status(404).json({ error: "Experience not found" });
  res.json(updated);
});

profileRouter.delete("/experiences/:id", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const deleted = await prisma.experience.deleteMany({ where: { id: req.params.id, profileId: profile.id } });
  if (deleted.count === 0) return res.status(404).json({ error: "Experience not found" });
  res.status(204).send();
});

// Skills CRUD
profileRouter.get("/skills", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.json([]);
  const list = await prisma.skill.findMany({ where: { profileId: profile.id }, orderBy: { orderIndex: "asc" } });
  res.json(list);
});

profileRouter.post("/skills", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const { name, category } = req.body as { name?: string; category?: string };
  const nameTrim = (name ?? "").trim();
  if (!nameTrim) return res.status(400).json({ error: "Skill name is required" });
  const existing = await prisma.skill.findFirst({
    where: { profileId: profile.id, name: { equals: nameTrim, mode: "insensitive" } },
  });
  if (existing) return res.json(existing);
  const count = await prisma.skill.count({ where: { profileId: profile.id } });
  const skill = await prisma.skill.create({
    data: {
      profileId: profile.id,
      name: nameTrim,
      category: category ?? null,
      orderIndex: count,
    },
  });
  res.status(201).json(skill);
});

profileRouter.patch("/skills/:id", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const id = req.params.id;
  const body = req.body as { name?: string; category?: string; orderIndex?: number };
  await prisma.skill.updateMany({ where: { id, profileId: profile.id }, data: body });
  const updated = await prisma.skill.findUnique({ where: { id } });
  if (!updated) return res.status(404).json({ error: "Skill not found" });
  res.json(updated);
});

profileRouter.delete("/skills/:id", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const deleted = await prisma.skill.deleteMany({ where: { id: req.params.id, profileId: profile.id } });
  if (deleted.count === 0) return res.status(404).json({ error: "Skill not found" });
  res.status(204).send();
});

// Certifications CRUD
profileRouter.get("/certifications", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.json([]);
  const list = await prisma.certification.findMany({ where: { profileId: profile.id }, orderBy: { orderIndex: "asc" } });
  res.json(list);
});

profileRouter.post("/certifications", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const { name, issuer, date, url } = req.body as { name?: string; issuer?: string; date?: string; url?: string };
  const count = await prisma.certification.count({ where: { profileId: profile.id } });
  const cert = await prisma.certification.create({
    data: {
      profileId: profile.id,
      name: name ?? "",
      issuer: issuer ?? null,
      date: date ?? null,
      url: url ?? null,
      orderIndex: count,
    },
  });
  res.status(201).json(cert);
});

profileRouter.patch("/certifications/:id", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const id = req.params.id;
  const body = req.body as { name?: string; issuer?: string; date?: string; url?: string; orderIndex?: number };
  await prisma.certification.updateMany({ where: { id, profileId: profile.id }, data: body });
  const updated = await prisma.certification.findUnique({ where: { id } });
  if (!updated) return res.status(404).json({ error: "Certification not found" });
  res.json(updated);
});

profileRouter.delete("/certifications/:id", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const deleted = await prisma.certification.deleteMany({ where: { id: req.params.id, profileId: profile.id } });
  if (deleted.count === 0) return res.status(404).json({ error: "Certification not found" });
  res.status(204).send();
});

// Awards CRUD
profileRouter.get("/awards", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.json([]);
  const list = await prisma.award.findMany({ where: { profileId: profile.id }, orderBy: { orderIndex: "asc" } });
  res.json(list);
});

profileRouter.post("/awards", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const { title, issuer, date, description } = req.body as { title?: string; issuer?: string; date?: string; description?: string };
  const count = await prisma.award.count({ where: { profileId: profile.id } });
  const award = await prisma.award.create({
    data: {
      profileId: profile.id,
      title: title ?? "",
      issuer: issuer ?? null,
      date: date ?? null,
      description: description ?? null,
      orderIndex: count,
    },
  });
  res.status(201).json(award);
});

profileRouter.patch("/awards/:id", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const id = req.params.id;
  const body = req.body as { title?: string; issuer?: string; date?: string; description?: string; orderIndex?: number };
  await prisma.award.updateMany({ where: { id, profileId: profile.id }, data: body });
  const updated = await prisma.award.findUnique({ where: { id } });
  if (!updated) return res.status(404).json({ error: "Award not found" });
  res.json(updated);
});

profileRouter.delete("/awards/:id", async (req: AuthRequest, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) return res.status(404).json({ error: "Profile not found" });
  const deleted = await prisma.award.deleteMany({ where: { id: req.params.id, profileId: profile.id } });
  if (deleted.count === 0) return res.status(404).json({ error: "Award not found" });
  res.status(204).send();
});
