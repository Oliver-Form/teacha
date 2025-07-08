
# PHASE 1 — Scaffolding

### Monorepo + Tooling

* [ ] Set up a GitHub repo
* [ ] Configure monorepo with [`pnpm`](w), [`turbo`](w) or [`nx`](w) (optional, but future-proof)
* [ ] Set up linting + formatting (ESLint, Prettier)
* [ ] Set up `tsconfig.json` with strict flags
* [ ] Add `.env` management (using `dotenv` or `env-schema`)
* [ ] Add logging framework (`pino` or `winston`)
* [ ] Set up error monitoring stub (e.g. Sentry later)

---

### Backend Setup (Fastify)

* [ ] Set up `Fastify` base server with TypeScript
* [ ] Implement route autoloading pattern
* [ ] Add request validation (with `zod` or `@hapi/joi`)
* [ ] Add Prisma with PostgreSQL
* [ ] Set up database connection and schema migration script
* [ ] Add basic health check route (`/healthz`)
* [ ] Set up workspace-scoped multi-tenancy (e.g. `workspaceId` in all core tables)

---

### Authentication

* [ ] Choose auth provider (Clerk / Auth.js / Supabase)
* [ ] Implement login/signup
* [ ] Add JWT/session middleware
* [ ] Enforce workspace-level access control
* [ ] Seed initial test users

---

# PHASE 2 — Database & Models

### Core Schema Design (Prisma)

* [ ] `User` – with email, role, workspaceId
* [ ] `Workspace` – uniquely identifies each CRM instance
* [ ] `Lead` – name, email, tags, notes, source
* [ ] `Campaign` – for email/SMS campaigns
* [ ] `Product` – represents courses/services being sold
* [ ] `Message` – track outreach per lead
* [ ] `TeamMember` – for shared CRM use
* [ ] Optional: `EventLog`, `Task`, `PipelineStage`

---

### Database Tasks

* [ ] Write seed scripts for test data
* [ ] Set up DB migrations (`prisma migrate`)
* [ ] Use `prisma generate` for type-safe queries
* [ ] Add `.prisma` generator for future analytics (e.g. Drizzle later)

---

# PHASE 3 — Core API

### Routes

* [ ] `POST /workspace` – create new tenant
* [ ] `GET /leads` – list with filtering/pagination
* [ ] `POST /leads` – create lead
* [ ] `PATCH /leads/:id` – update lead
* [ ] `GET /campaigns` – list campaigns
* [ ] `POST /campaigns` – send marketing message
* [ ] `POST /messages` – log an interaction with a lead

---

### Middlewares & Utilities

* [ ] Auth middleware
* [ ] Error handling middleware
* [ ] Rate limiting (optional at MVP)
* [ ] Role-based access (admin vs team member)
* [ ] Multi-tenant scoping via `workspaceId`

---

# PHASE 4 — DevOps & Deployment

### Deployment

* [ ] Set up VPS on DigitalOcean
* [ ] Install Node, PM2, git
* [ ] Secure VPS (UFW, SSH key, fail2ban)
* [ ] Set up environment variables
* [ ] Deploy app using PM2
* [ ] Automate deployment script
* [ ] Point domain (api.yourcrm.com) via Cloudflare

---

### Database

* [ ] Provision managed PostgreSQL on DigitalOcean
* [ ] Connect using SSL
* [ ] Set up automated backups

---

### Optional Tooling

* [ ] Add monitoring (e.g. Grafana + Prometheus, or Axiom/Sentry)
* [ ] Add logs viewer (e.g. Logtail, self-hosted Loki)

---

# PHASE 5 — Admin Frontend (Next.js)

### App Structure

* [ ] Set up Next.js with App Router + Tailwind + shadcn/ui
* [ ] Configure workspace-aware routes (`/app/[workspaceId]/dashboard`)
* [ ] Auth integration with backend
* [ ] Reusable layout + sidebar components
* [ ] Tables and modals for CRUD (Leads, Campaigns)

---

# PHASE 6 — Communications & Payments

### Email

* [ ] Connect Resend/Postmark
* [ ] Template system for lead outreach
* [ ] Campaign sending logic (batch with retry)
* [ ] Logs for message delivery

### Payments

* [ ] Set up Stripe
* [ ] Workspace linked to Stripe customer
* [ ] Subscription or one-time payment flow

---

# PHASE 7 — Polish & MVP Launch

* [ ] Add basic analytics (lead count, revenue, etc.)
* [ ] Finalize admin dashboard UI polish
* [ ] Write internal docs (README, API docs)
* [ ] Deploy staging + production environments
* [ ] Onboard first alpha tester (even fake client is OK)
* [ ] Start building landing page + waitlist

---

