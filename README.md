# Resume Builder

Web-based resume builder with conversational data collection, template-based PDF generation, job-posting-aware cover letters, and a persistent user knowledge base.

## Structure

- **frontend/** – Next.js (React, TypeScript, Tailwind)
- **backend/** – Node.js API (Express, TypeScript, Prisma, PostgreSQL)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- (Optional) Docker for local Postgres

## Quick Start

1. **Database:** Either:
   - **Docker:** From the project root run `docker compose up -d` (uses `postgres`/`postgres`, DB `resume_builder`; matches `backend/.env`), or
   - **Local Postgres:** Create a PostgreSQL database and set `DATABASE_URL` in `backend/.env` (e.g. `postgresql://user:pass@localhost:5432/resume_builder`).

2. **Backend:**
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate dev   # or: npx prisma db push
   npm run dev
   ```
   API runs at [http://localhost:4000](http://localhost:4000).

3. **Frontend:** Create `frontend/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:4000`, then:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   App runs at [http://localhost:3000](http://localhost:3000).

4. **Optional:** Set `OPENAI_API_KEY` in `backend/.env` for resume parsing, job analysis, and cover letters. Without it, upload and job analysis still work but parsing/generation will be skipped or return placeholders.

## Environment

- **Backend** – See `backend/.env.example` for `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, S3 vars.
- **Frontend** – See `frontend/.env.local.example` for `NEXT_PUBLIC_API_URL`.

## Features

- Sign up / login (JWT)
- Profile (knowledge base): contact, education, experience, skills
- Upload resume (doc/pdf/txt) → parse with AI → fill profile
- Conversational onboarding (build from scratch)
- Resume draft and multiple templates
- PDF export
- Job posting (URL or text) → match score, missing requirements, tailored resume + cover letter
- Add experience / add skill via chat
- Subscription tiers (free / paid)
