# SkinSage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a conversational AI skin health chatbot web app — Docker-first, mobile-ready API.

**Architecture:** Next.js 14 frontend + Node.js/Fastify API as two Docker containers. All AI via Claude API (multimodal). PostgreSQL + Redis for data and job queuing.

**Tech Stack:** Next.js 14, Fastify, TypeScript, PostgreSQL, Redis, BullMQ, Anthropic SDK, NextAuth.js, Twilio, Resend, Firebase FCM, Google Places API, Cloudflare R2, Docker Compose, Jest, Playwright.

---

## File Structure

```
skinsage/
├── docker-compose.yml
├── docker-compose.test.yml
├── .env.example
├── .gitignore
│
├── api/                              # Node.js/Fastify backend
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                  # Server entry point
│   │   ├── config.ts                 # Env var validation & export
│   │   ├── db/
│   │   │   ├── client.ts             # PostgreSQL pool
│   │   │   └── migrations/
│   │   │       ├── 001_users.sql
│   │   │       ├── 002_chat_sessions.sql
│   │   │       ├── 003_questionnaires.sql
│   │   │       ├── 004_recommendations.sql
│   │   │       ├── 005_progress_logs.sql
│   │   │       └── 006_notification_jobs.sql
│   │   ├── plugins/
│   │   │   ├── cors.ts
│   │   │   └── auth-guard.ts         # JWT verification hook
│   │   ├── routes/
│   │   │   ├── auth.ts               # /auth/* endpoints
│   │   │   ├── chat.ts               # /chat/* endpoints + SSE streaming
│   │   │   ├── doctors.ts            # /doctors/nearby
│   │   │   ├── notifications.ts      # /user/notifications
│   │   │   └── progress.ts           # /progress
│   │   ├── services/
│   │   │   ├── claude.ts             # Claude API wrapper (text + vision)
│   │   │   ├── auth.ts               # bcrypt, JWT, OTP logic
│   │   │   ├── storage.ts            # Cloudflare R2 upload
│   │   │   ├── doctors.ts            # Google Places API
│   │   │   ├── notifications/
│   │   │   │   ├── email.ts          # Resend
│   │   │   │   ├── sms.ts            # Twilio SMS
│   │   │   │   └── push.ts           # Firebase FCM
│   │   │   └── queue.ts              # BullMQ job queue
│   │   └── prompts/
│   │       ├── skin-analysis.ts      # System prompt for initial analysis
│   │       ├── questionnaire.ts      # System prompt for lifestyle questions
│   │       └── recommendations.ts   # System prompt for final recommendations
│   └── tests/
│       ├── auth.test.ts
│       ├── chat.test.ts
│       ├── doctors.test.ts
│       └── notifications.test.ts
│
└── frontend/                         # Next.js 14 frontend
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── public/
    │   └── firebase-messaging-sw.js  # FCM service worker
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx              # Landing / redirect to /chat
    │   │   ├── auth/
    │   │   │   └── page.tsx          # Login/Register page
    │   │   ├── chat/
    │   │   │   └── page.tsx          # Main chat UI
    │   │   ├── progress/
    │   │   │   └── page.tsx          # Progress log page
    │   │   └── api/
    │   │       └── auth/
    │   │           └── [...nextauth]/route.ts  # NextAuth handler
    │   ├── components/
    │   │   ├── chat/
    │   │   │   ├── ChatWindow.tsx    # Scrollable message list
    │   │   │   ├── MessageBubble.tsx # Individual message (user/bot)
    │   │   │   ├── ChatInput.tsx     # Text input + image upload button
    │   │   │   └── DoctorCard.tsx    # Doctor result card with deep-links
    │   │   ├── auth/
    │   │   │   ├── EmailForm.tsx
    │   │   │   └── PhoneForm.tsx
    │   │   └── progress/
    │   │       ├── ProgressForm.tsx
    │   │       └── ProgressList.tsx
    │   ├── lib/
    │   │   ├── api-client.ts         # Typed fetch wrapper for API calls
    │   │   └── fcm.ts                # Firebase push init + token getter
    │   └── types/
    │       └── index.ts              # Shared TypeScript types
    └── tests/
        └── e2e/
            └── chat-flow.spec.ts     # Playwright full flow test
```

---

## Phase 1: Project Scaffold & Docker

### Task 1: Monorepo root scaffold

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create root docker-compose.yml**

```yaml
# docker-compose.yml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: skinsage
      POSTGRES_PASSWORD: skinsage
      POSTGRES_DB: skinsage
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build: ./api
    ports:
      - "4000:4000"
    env_file: .env
    environment:
      DATABASE_URL: postgres://skinsage:skinsage@postgres:5432/skinsage
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file: .env
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
    depends_on:
      - api

volumes:
  postgres_data:
```

- [ ] **Step 2: Create .env.example**

```bash
# .env.example
ANTHROPIC_API_KEY=
GOOGLE_PLACES_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
RESEND_API_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
R2_BUCKET=
R2_ACCESS_KEY=
R2_SECRET_KEY=
R2_ENDPOINT=
JWT_SECRET=
```

- [ ] **Step 3: Create .gitignore**

```
.env
node_modules/
.next/
dist/
*.log
.superpowers/
```

- [ ] **Step 4: Commit**

```bash
git init
git add docker-compose.yml .env.example .gitignore
git commit -m "chore: monorepo root scaffold"
```

---

### Task 2: API service scaffold

**Files:**
- Create: `api/package.json`
- Create: `api/tsconfig.json`
- Create: `api/Dockerfile`
- Create: `api/src/index.ts`
- Create: `api/src/config.ts`

- [ ] **Step 1: Create api/package.json**

```json
{
  "name": "skinsage-api",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --runInBand"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.27.0",
    "@aws-sdk/client-s3": "^3.600.0",
    "bcryptjs": "^2.4.3",
    "bullmq": "^5.12.0",
    "fastify": "^4.28.0",
    "@fastify/cors": "^9.0.1",
    "@fastify/multipart": "^8.3.0",
    "firebase-admin": "^12.2.0",
    "ioredis": "^5.4.1",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.12.0",
    "resend": "^3.3.0",
    "twilio": "^5.2.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/jest": "^29.5.12",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "^20.14.10",
    "@types/pg": "^8.11.6",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.2",
    "tsx": "^4.16.2",
    "typescript": "^5.5.3"
  }
}
```

- [ ] **Step 2: Create api/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create api/Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 4: Create api/src/config.ts**

```typescript
// api/src/config.ts
import { z } from "zod";

const schema = z.object({
  PORT: z.string().default("4000"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  JWT_SECRET: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  GOOGLE_PLACES_API_KEY: z.string(),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_ACCESS_KEY: z.string().optional(),
  R2_SECRET_KEY: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
});

export const config = schema.parse(process.env);
```

- [ ] **Step 5: Create api/src/index.ts**

```typescript
// api/src/index.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { config } from "./config";
import { authRoutes } from "./routes/auth";
import { chatRoutes } from "./routes/chat";
import { doctorRoutes } from "./routes/doctors";
import { notificationRoutes } from "./routes/notifications";
import { progressRoutes } from "./routes/progress";

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.register(authRoutes, { prefix: "/auth" });
  app.register(chatRoutes, { prefix: "/chat" });
  app.register(doctorRoutes, { prefix: "/doctors" });
  app.register(notificationRoutes, { prefix: "/user" });
  app.register(progressRoutes, { prefix: "/progress" });

  app.get("/health", async () => ({ status: "ok" }));

  await app.listen({ port: Number(config.PORT), host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 6: Install dependencies and verify TypeScript compiles**

```bash
cd api && npm install && npx tsc --noEmit
```

Expected: No errors (some route imports will fail until stubs are created in Task 3).

- [ ] **Step 7: Commit**

```bash
git add api/
git commit -m "chore: api service scaffold"
```

---

### Task 3: API route stubs (so index.ts compiles)

**Files:**
- Create: `api/src/routes/auth.ts`
- Create: `api/src/routes/chat.ts`
- Create: `api/src/routes/doctors.ts`
- Create: `api/src/routes/notifications.ts`
- Create: `api/src/routes/progress.ts`

- [ ] **Step 1: Create stub route files**

```typescript
// api/src/routes/auth.ts
import { FastifyInstance } from "fastify";
export async function authRoutes(app: FastifyInstance) {
  app.get("/ping", async () => ({ route: "auth" }));
}
```

```typescript
// api/src/routes/chat.ts
import { FastifyInstance } from "fastify";
export async function chatRoutes(app: FastifyInstance) {
  app.get("/ping", async () => ({ route: "chat" }));
}
```

```typescript
// api/src/routes/doctors.ts
import { FastifyInstance } from "fastify";
export async function doctorRoutes(app: FastifyInstance) {
  app.get("/ping", async () => ({ route: "doctors" }));
}
```

```typescript
// api/src/routes/notifications.ts
import { FastifyInstance } from "fastify";
export async function notificationRoutes(app: FastifyInstance) {
  app.get("/ping", async () => ({ route: "notifications" }));
}
```

```typescript
// api/src/routes/progress.ts
import { FastifyInstance } from "fastify";
export async function progressRoutes(app: FastifyInstance) {
  app.get("/ping", async () => ({ route: "progress" }));
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd api && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add api/src/routes/
git commit -m "chore: api route stubs"
```

---

### Task 4: Frontend scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/next.config.ts`
- Create: `frontend/Dockerfile`
- Create: `frontend/src/app/layout.tsx`
- Create: `frontend/src/app/page.tsx`
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/lib/api-client.ts`

- [ ] **Step 1: Create frontend/package.json**

```json
{
  "name": "skinsage-frontend",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "next-auth": "^4.24.7",
    "firebase": "^10.12.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.45.1",
    "@types/node": "^20.14.10",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.3"
  }
}
```

- [ ] **Step 2: Create frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create frontend/next.config.ts**

```typescript
import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  experimental: { serverActions: { allowedOrigins: ["localhost:3000"] } },
};
export default config;
```

- [ ] **Step 4: Create frontend/Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 5: Create frontend/src/types/index.ts**

```typescript
// frontend/src/types/index.ts
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  questionnaireComplete: boolean;
}

export interface Doctor {
  placeId: string;
  name: string;
  rating: number;
  address: string;
  phone?: string;
  openNow?: boolean;
}

export interface ProgressLog {
  id: string;
  date: string;
  notes: string;
  rating: number;
  photoUrl?: string;
}

export interface Recommendation {
  homeRemedies: string[];
  routineChanges: { morning: string[]; night: string[] };
  habitSuggestions: string[];
  products: { name: string; category: string; reason: string }[];
  exercises: string[];
}
```

- [ ] **Step 6: Create frontend/src/lib/api-client.ts**

```typescript
// frontend/src/lib/api-client.ts
const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "POST",
      body: JSON.stringify(body),
    }),
  put: <T>(path: string, body: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "PUT",
      body: JSON.stringify(body),
    }),
};
```

- [ ] **Step 7: Create frontend/src/app/layout.tsx**

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "SkinSage",
  description: "AI-powered skin health advisor",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0f172a", color: "#f1f5f9" }}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create frontend/src/app/page.tsx**

```tsx
// frontend/src/app/page.tsx
import { redirect } from "next/navigation";
export default function Home() {
  redirect("/chat");
}
```

- [ ] **Step 9: Install and verify**

```bash
cd frontend && npm install && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/
git commit -m "chore: frontend scaffold"
```

---

## Phase 2: Database & Auth

### Task 5: Database migrations

**Files:**
- Create: `api/src/db/client.ts`
- Create: `api/src/db/migrate.ts`
- Create: `api/src/db/migrations/001_users.sql`
- Create: `api/src/db/migrations/002_chat_sessions.sql`
- Create: `api/src/db/migrations/003_questionnaires.sql`
- Create: `api/src/db/migrations/004_recommendations.sql`
- Create: `api/src/db/migrations/005_progress_logs.sql`
- Create: `api/src/db/migrations/006_notification_jobs.sql`

- [ ] **Step 1: Create api/src/db/client.ts**

```typescript
// api/src/db/client.ts
import { Pool } from "pg";
import { config } from "../config";

export const db = new Pool({ connectionString: config.DATABASE_URL });
```

- [ ] **Step 2: Create migration SQL files**

```sql
-- api/src/db/migrations/001_users.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  email_verified BOOLEAN DEFAULT false,
  password_hash TEXT,
  phone TEXT UNIQUE,
  auth_methods JSONB NOT NULL DEFAULT '[]',
  location_city TEXT,
  location_pin TEXT,
  notification_email BOOLEAN DEFAULT true,
  notification_sms BOOLEAN DEFAULT false,
  notification_push BOOLEAN DEFAULT false,
  notification_frequency TEXT DEFAULT 'weekly',
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
-- api/src/db/migrations/002_chat_sessions.sql
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  skin_concern_text TEXT,
  skin_image_url TEXT,
  questionnaire_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
-- api/src/db/migrations/003_questionnaires.sql
CREATE TABLE IF NOT EXISTS questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  diet_type TEXT,
  water_ml_per_day INTEGER,
  sleep_hours NUMERIC(3,1),
  smoking BOOLEAN,
  alcohol_frequency TEXT,
  exercise_frequency TEXT,
  stress_level TEXT,
  sun_exposure TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
-- api/src/db/migrations/004_recommendations.sql
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  home_remedies JSONB DEFAULT '[]',
  routine_changes JSONB DEFAULT '{}',
  habit_suggestions JSONB DEFAULT '[]',
  products JSONB DEFAULT '[]',
  exercises JSONB DEFAULT '[]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
-- api/src/db/migrations/005_progress_logs.sql
CREATE TABLE IF NOT EXISTS progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
-- api/src/db/migrations/006_notification_jobs.sql
CREATE TABLE IF NOT EXISTS notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email','sms','push')),
  template TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 3: Create api/src/db/migrate.ts**

```typescript
// api/src/db/migrate.ts
import fs from "fs";
import path from "path";
import { db } from "./client";

export async function runMigrations() {
  const dir = path.join(__dirname, "migrations");
  const files = fs.readdirSync(dir).sort();
  for (const file of files) {
    if (!file.endsWith(".sql")) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    await db.query(sql);
    console.log(`Migration applied: ${file}`);
  }
}
```

- [ ] **Step 4: Call runMigrations in api/src/index.ts — update the main() function**

```typescript
// Replace the existing main() in api/src/index.ts
import { runMigrations } from "./db/migrate";

async function main() {
  await runMigrations();

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.register(authRoutes, { prefix: "/auth" });
  app.register(chatRoutes, { prefix: "/chat" });
  app.register(doctorRoutes, { prefix: "/doctors" });
  app.register(notificationRoutes, { prefix: "/user" });
  app.register(progressRoutes, { prefix: "/progress" });

  app.get("/health", async () => ({ status: "ok" }));

  await app.listen({ port: Number(config.PORT), host: "0.0.0.0" });
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add api/src/db/
git commit -m "feat: database migrations"
```

---

### Task 6: Auth service (JWT + bcrypt + OTP)

**Files:**
- Create: `api/src/services/auth.ts`
- Create: `api/tests/auth.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// api/tests/auth.test.ts
import { hashPassword, verifyPassword, generateJwt, verifyJwt } from "../src/services/auth";

describe("auth service", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("secret123");
    expect(await verifyPassword("secret123", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("generates and verifies a JWT", () => {
    const token = generateJwt({ userId: "abc-123" });
    const payload = verifyJwt(token);
    expect(payload.userId).toBe("abc-123");
  });

  it("throws on invalid JWT", () => {
    expect(() => verifyJwt("bad.token.here")).toThrow();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd api && npx jest tests/auth.test.ts
```

Expected: FAIL — `hashPassword` not found.

- [ ] **Step 3: Create api/src/services/auth.ts**

```typescript
// api/src/services/auth.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { db } from "../db/client";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function generateJwt(payload: { userId: string }): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: "30d" });
}

export function verifyJwt(token: string): { userId: string } {
  return jwt.verify(token, config.JWT_SECRET) as { userId: string };
}

export async function createUserWithEmail(
  name: string,
  email: string,
  password: string
): Promise<{ id: string; email: string; name: string }> {
  const hash = await hashPassword(password);
  const result = await db.query(
    `INSERT INTO users (name, email, password_hash, auth_methods)
     VALUES ($1, $2, $3, '["email"]')
     RETURNING id, email, name`,
    [name, email, hash]
  );
  return result.rows[0];
}

export async function findUserByEmail(email: string) {
  const result = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return result.rows[0] ?? null;
}

export async function createOrUpdateUserWithPhone(phone: string, name?: string) {
  const result = await db.query(
    `INSERT INTO users (phone, name, auth_methods)
     VALUES ($1, $2, '["phone"]')
     ON CONFLICT (phone) DO UPDATE SET updated_at = NOW()
     RETURNING id, phone, name`,
    [phone, name ?? "User"]
  );
  return result.rows[0];
}
```

- [ ] **Step 4: Add jest config to api/package.json**

Add to `api/package.json` under a top-level `"jest"` key:

```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "testMatch": ["**/tests/**/*.test.ts"]
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
cd api && npx jest tests/auth.test.ts
```

Expected: PASS (3 tests — hash/verify, generate JWT, invalid JWT throws).

- [ ] **Step 6: Commit**

```bash
git add api/src/services/auth.ts api/tests/auth.test.ts api/package.json
git commit -m "feat: auth service — bcrypt + JWT"
```

---

### Task 7: Auth plugin (JWT guard) and auth routes

**Files:**
- Create: `api/src/plugins/auth-guard.ts`
- Modify: `api/src/routes/auth.ts`

- [ ] **Step 1: Create api/src/plugins/auth-guard.ts**

```typescript
// api/src/plugins/auth-guard.ts
import fp from "fastify-plugin";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyJwt } from "../services/auth";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

export const authGuard = fp(async (app: FastifyInstance) => {
  app.decorateRequest("userId", "");
  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      reply.code(401).send({ error: "Unauthorized", code: "UNAUTHORIZED" });
      return;
    }
    try {
      const payload = verifyJwt(header.slice(7));
      req.userId = payload.userId;
    } catch {
      reply.code(401).send({ error: "Invalid token", code: "INVALID_TOKEN" });
    }
  });
});
```

- [ ] **Step 2: Update api/src/routes/auth.ts with real endpoints**

```typescript
// api/src/routes/auth.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createUserWithEmail,
  findUserByEmail,
  verifyPassword,
  generateJwt,
  createOrUpdateUserWithPhone,
} from "../services/auth";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const phoneSchema = z.object({ phone: z.string().min(10) });
const otpSchema = z.object({ phone: z.string(), otp: z.string().length(6) });

// In-memory OTP store for dev; replace with Redis in production
const otpStore = new Map<string, { otp: string; expires: number }>();

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req, reply) => {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }
    try {
      const user = await createUserWithEmail(body.data.name, body.data.email, body.data.password);
      const token = generateJwt({ userId: user.id });
      return reply.code(201).send({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err: any) {
      if (err.code === "23505") {
        return reply.code(409).send({ error: "Email already registered", code: "EMAIL_EXISTS" });
      }
      throw err;
    }
  });

  app.post("/login", async (req, reply) => {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }
    const user = await findUserByEmail(body.data.email);
    if (!user || !user.password_hash) {
      return reply.code(401).send({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    }
    const valid = await verifyPassword(body.data.password, user.password_hash);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid credentials", code: "INVALID_CREDENTIALS" });
    }
    const token = generateJwt({ userId: user.id });
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  });

  app.post("/phone/send-otp", async (req, reply) => {
    const body = phoneSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid phone", code: "VALIDATION_ERROR" });
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(body.data.phone, { otp, expires: Date.now() + 5 * 60 * 1000 });
    // In production: await sendSms(body.data.phone, `Your SkinSage OTP: ${otp}`)
    app.log.info(`OTP for ${body.data.phone}: ${otp}`);
    return { message: "OTP sent" };
  });

  app.post("/phone/verify-otp", async (req, reply) => {
    const body = otpSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }
    const stored = otpStore.get(body.data.phone);
    if (!stored || stored.otp !== body.data.otp || stored.expires < Date.now()) {
      return reply.code(401).send({ error: "Invalid or expired OTP", code: "INVALID_OTP" });
    }
    otpStore.delete(body.data.phone);
    const user = await createOrUpdateUserWithPhone(body.data.phone);
    const token = generateJwt({ userId: user.id });
    return { token, user: { id: user.id, phone: user.phone, name: user.name } };
  });
}
```

- [ ] **Step 3: Add fastify-plugin dependency**

```bash
cd api && npm install fastify-plugin
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add api/src/plugins/ api/src/routes/auth.ts api/package.json
git commit -m "feat: auth routes — register, login, phone OTP"
```

---

### Task 8: Frontend auth page

**Files:**
- Create: `frontend/src/app/auth/page.tsx`
- Create: `frontend/src/components/auth/EmailForm.tsx`
- Create: `frontend/src/components/auth/PhoneForm.tsx`
- Create: `frontend/src/app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create frontend/src/components/auth/EmailForm.tsx**

```tsx
// frontend/src/components/auth/EmailForm.tsx
"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

interface Props {
  onSuccess: (token: string, name: string) => void;
}

export function EmailForm({ onSuccess }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const body = mode === "register" ? { name, email, password } : { email, password };
      const res = await apiClient.post<{ token: string; user: { name: string } }>(path, body);
      localStorage.setItem("token", res.token);
      onSuccess(res.token, res.user.name);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {mode === "register" && (
        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)}
          style={inputStyle} required />
      )}
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
        style={inputStyle} required />
      <input type="password" placeholder="Password (min 8 chars)" value={password}
        onChange={e => setPassword(e.target.value)} style={inputStyle} required minLength={8} />
      {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}
      <button type="submit" style={btnStyle}>
        {mode === "register" ? "Create Account" : "Login"}
      </button>
      <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}
        style={{ ...btnStyle, background: "transparent", border: "1px solid #334155" }}>
        {mode === "login" ? "New here? Register" : "Have an account? Login"}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 8, border: "1px solid #334155",
  background: "#1e293b", color: "#f1f5f9", fontSize: 15,
};
const btnStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 8, background: "#6366f1",
  color: "#fff", border: "none", cursor: "pointer", fontSize: 15,
};
```

- [ ] **Step 2: Create frontend/src/components/auth/PhoneForm.tsx**

```tsx
// frontend/src/components/auth/PhoneForm.tsx
"use client";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";

interface Props {
  onSuccess: (token: string, name: string) => void;
}

export function PhoneForm({ onSuccess }: Props) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [error, setError] = useState("");

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiClient.post("/auth/phone/send-otp", { phone });
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const res = await apiClient.post<{ token: string; user: { name: string } }>(
        "/auth/phone/verify-otp", { phone, otp }
      );
      localStorage.setItem("token", res.token);
      onSuccess(res.token, res.user.name);
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (step === "otp") {
    return (
      <form onSubmit={verifyOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>OTP sent to {phone}</p>
        <input placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)}
          style={inputStyle} required maxLength={6} />
        {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}
        <button type="submit" style={btnStyle}>Verify OTP</button>
      </form>
    );
  }

  return (
    <form onSubmit={sendOtp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <input placeholder="+91 9876543210" value={phone} onChange={e => setPhone(e.target.value)}
        style={inputStyle} required />
      {error && <p style={{ color: "#f87171", fontSize: 14 }}>{error}</p>}
      <button type="submit" style={btnStyle}>Send OTP</button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 8, border: "1px solid #334155",
  background: "#1e293b", color: "#f1f5f9", fontSize: 15,
};
const btnStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 8, background: "#6366f1",
  color: "#fff", border: "none", cursor: "pointer", fontSize: 15,
};
```

- [ ] **Step 3: Create frontend/src/app/auth/page.tsx**

```tsx
// frontend/src/app/auth/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmailForm } from "@/components/auth/EmailForm";
import { PhoneForm } from "@/components/auth/PhoneForm";

export default function AuthPage() {
  const [method, setMethod] = useState<"email" | "phone">("email");
  const router = useRouter();

  function onSuccess(_token: string, _name: string) {
    router.push("/chat");
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 380, padding: 32, background: "#1e293b", borderRadius: 16 }}>
        <h1 style={{ margin: "0 0 8px", fontSize: 24 }}>SkinSage</h1>
        <p style={{ color: "#94a3b8", margin: "0 0 24px", fontSize: 14 }}>
          AI-powered skin health advisor
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {(["email", "phone"] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                background: method === m ? "#6366f1" : "#0f172a", color: "#f1f5f9", fontSize: 14,
              }}>
              {m === "email" ? "Email / Social" : "Phone OTP"}
            </button>
          ))}
        </div>
        {method === "email" ? <EmailForm onSuccess={onSuccess} /> : <PhoneForm onSuccess={onSuccess} />}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create NextAuth route stub (for future OAuth)**

```typescript
// frontend/src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
});

export { handler as GET, handler as POST };
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/auth/ frontend/src/components/auth/ frontend/src/app/api/
git commit -m "feat: auth pages — email/password and phone OTP"
```

---

## Phase 3: Claude AI & Chat

### Task 9: Claude service with streaming

**Files:**
- Create: `api/src/services/claude.ts`
- Create: `api/src/prompts/skin-analysis.ts`
- Create: `api/src/prompts/questionnaire.ts`
- Create: `api/src/prompts/recommendations.ts`

- [ ] **Step 1: Create api/src/prompts/skin-analysis.ts**

```typescript
// api/src/prompts/skin-analysis.ts
export const SKIN_ANALYSIS_SYSTEM = `You are SkinSage, an empathetic AI skin health advisor. 

Your role:
- Analyze skin concerns from images or text descriptions
- Ask gentle, one-at-a-time follow-up questions to understand the user's lifestyle
- Provide evidence-based, holistic skin health advice
- Always recommend professional dermatologist consultation for severe conditions
- Never diagnose medical conditions — you are a wellness advisor, not a doctor

Conversation flow:
1. Acknowledge the skin concern warmly
2. Ask ONE clarifying question about their concern
3. Then naturally transition to understanding their lifestyle (use the questionnaire prompts)
4. Once you have lifestyle info, provide structured recommendations

Keep responses concise and conversational. Use plain language, not medical jargon.
Always end initial analysis with: asking about their daily skincare routine.

IMPORTANT: You are NOT a medical professional. Always include a disclaimer for serious conditions.`;

export function buildSkinAnalysisMessage(
  concern: string,
  imageBase64?: string
): { role: "user"; content: any } {
  if (imageBase64) {
    return {
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
        },
        { type: "text", text: concern || "Please analyze my skin concern in this image." },
      ],
    };
  }
  return { role: "user", content: concern };
}
```

- [ ] **Step 2: Create api/src/prompts/questionnaire.ts**

```typescript
// api/src/prompts/questionnaire.ts
export const QUESTIONNAIRE_FIELDS = [
  { key: "skincare_routine", question: "What does your current skincare routine look like? (morning/night products, if any)" },
  { key: "diet_type", question: "How would you describe your diet? (e.g. vegetarian, non-veg, vegan, lots of junk food)" },
  { key: "water_intake", question: "Roughly how much water do you drink per day? (glasses or ml)" },
  { key: "sleep", question: "How many hours of sleep do you typically get, and how would you rate the quality?" },
  { key: "smoking", question: "Do you smoke? If yes, how frequently?" },
  { key: "alcohol", question: "How often do you consume alcohol?" },
  { key: "exercise", question: "How often do you exercise, and what kind?" },
  { key: "stress", question: "How would you rate your stress level lately — low, medium, or high?" },
  { key: "sun_exposure", question: "How much sun exposure do you get daily, and do you use sunscreen?" },
];

export const QUESTIONNAIRE_TRANSITION = `
Now I have a better picture of your concern. To give you truly personalized advice, 
I'd like to understand your lifestyle a bit better. I'll ask a few quick questions — 
just answer naturally, no need to be precise.
`;
```

- [ ] **Step 3: Create api/src/prompts/recommendations.ts**

```typescript
// api/src/prompts/recommendations.ts
export const RECOMMENDATIONS_SYSTEM = `Based on the skin concern and lifestyle information shared, 
provide a comprehensive, personalized skin health plan. Structure your response EXACTLY as follows:

## 🌿 Home Remedies
List 3-5 ingredient-based home remedies with instructions. Focus on what's easy to find in India.

## 📋 Daily Routine
### Morning Routine
Step-by-step morning skincare (5-7 steps max).
### Night Routine  
Step-by-step night skincare (5-7 steps max).

## 💪 Habit & Lifestyle Changes
3-5 specific habit changes (diet, water, sleep, stress, exercise) tailored to their answers.

## 🛒 OTC Products (No Prescription Needed)
List 5-7 specific product categories or brands available in India without a prescription.
Format each as: **Product name** — why it helps for their specific concern.

## 🏃 Exercises for Skin Health
2-3 exercises or practices (yoga poses, facial exercises, breathing) beneficial for their skin type.

## ⚠️ When to See a Dermatologist
Based on what they described, indicate if/when they should consult a professional.

Keep advice practical, affordable, and India-appropriate. Mention specific Indian brands where helpful.`;
```

- [ ] **Step 4: Create api/src/services/claude.ts**

```typescript
// api/src/services/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config";
import { SKIN_ANALYSIS_SYSTEM } from "../prompts/skin-analysis";

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* streamChatResponse(
  messages: ChatMessage[],
  systemPrompt: string = SKIN_ANALYSIS_SYSTEM
): AsyncGenerator<string> {
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}

export async function* streamVisionResponse(
  messages: any[],
  systemPrompt: string = SKIN_ANALYSIS_SYSTEM
): AsyncGenerator<string> {
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: systemPrompt,
    messages,
  });

  for await (const chunk of stream) {
    if (
      chunk.type === "content_block_delta" &&
      chunk.delta.type === "text_delta"
    ) {
      yield chunk.delta.text;
    }
  }
}

export async function generateRecommendations(
  sessionSummary: string,
  questionnaire: Record<string, string>
): Promise<string> {
  const questionnaireText = Object.entries(questionnaire)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `${SKIN_ANALYSIS_SYSTEM}\n\nWhen generating final recommendations, use this structure exactly.`,
    messages: [
      {
        role: "user",
        content: `Skin concern summary: ${sessionSummary}\n\nLifestyle questionnaire answers:\n${questionnaireText}\n\nPlease provide the complete personalized skin health plan.`,
      },
    ],
  });

  return (response.content[0] as { text: string }).text;
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add api/src/services/claude.ts api/src/prompts/
git commit -m "feat: Claude service with SSE streaming and vision support"
```

---

### Task 10: Chat routes with SSE streaming

**Files:**
- Modify: `api/src/routes/chat.ts`
- Create: `api/tests/chat.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// api/tests/chat.test.ts
import { buildSkinAnalysisMessage } from "../src/prompts/skin-analysis";

describe("skin analysis prompt builder", () => {
  it("builds text-only message", () => {
    const msg = buildSkinAnalysisMessage("I have dry skin");
    expect(msg.role).toBe("user");
    expect(msg.content).toBe("I have dry skin");
  });

  it("builds vision message with image", () => {
    const msg = buildSkinAnalysisMessage("check this", "base64data");
    expect(msg.role).toBe("user");
    expect(Array.isArray(msg.content)).toBe(true);
    const content = msg.content as any[];
    expect(content[0].type).toBe("image");
    expect(content[1].type).toBe("text");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd api && npx jest tests/chat.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Run test again after prompts are in place**

```bash
cd api && npx jest tests/chat.test.ts
```

Expected: PASS (prompts/skin-analysis.ts was created in Task 9).

- [ ] **Step 4: Replace api/src/routes/chat.ts with real implementation**

```typescript
// api/src/routes/chat.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client";
import { streamChatResponse, streamVisionResponse, generateRecommendations } from "../services/claude";
import { SKIN_ANALYSIS_SYSTEM } from "../prompts/skin-analysis";
import { RECOMMENDATIONS_SYSTEM } from "../prompts/recommendations";
import { authGuard } from "../plugins/auth-guard";

export async function chatRoutes(app: FastifyInstance) {
  await app.register(authGuard);

  // Create new chat session
  app.post("/session", async (req, reply) => {
    const result = await db.query(
      `INSERT INTO chat_sessions (user_id) VALUES ($1) RETURNING id, created_at`,
      [req.userId]
    );
    return reply.code(201).send(result.rows[0]);
  });

  // Get session history
  app.get<{ Params: { id: string } }>("/session/:id", async (req, reply) => {
    const result = await db.query(
      `SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: "Session not found", code: "NOT_FOUND" });
    return result.rows[0];
  });

  // Send message — streams Claude response via SSE
  app.post<{ Params: { id: string } }>("/session/:id/message", async (req, reply) => {
    const session = await db.query(
      `SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (!session.rows[0]) return reply.code(404).send({ error: "Session not found", code: "NOT_FOUND" });

    const body = req.body as { text?: string; imageBase64?: string };
    const userMessage = { role: "user" as const, content: body.text ?? "" };

    // Append user message to session
    await db.query(
      `UPDATE chat_sessions SET messages = messages || $1::jsonb WHERE id = $2`,
      [JSON.stringify([{ ...userMessage, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]), req.params.id]
    );

    const history: { role: "user" | "assistant"; content: string }[] =
      session.rows[0].messages ?? [];

    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.flushHeaders();

    let fullResponse = "";

    const stream = body.imageBase64
      ? streamVisionResponse(
          [
            ...history,
            {
              role: "user",
              content: [
                { type: "image", source: { type: "base64", media_type: "image/jpeg", data: body.imageBase64 } },
                { type: "text", text: body.text ?? "Please analyze my skin." },
              ],
            },
          ],
          SKIN_ANALYSIS_SYSTEM
        )
      : streamChatResponse([...history, userMessage], SKIN_ANALYSIS_SYSTEM);

    for await (const chunk of stream) {
      fullResponse += chunk;
      reply.raw.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }

    // Persist assistant message
    const assistantMsg = { role: "assistant", content: fullResponse, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    await db.query(
      `UPDATE chat_sessions SET messages = messages || $1::jsonb WHERE id = $2`,
      [JSON.stringify([assistantMsg]), req.params.id]
    );

    reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    reply.raw.end();
  });

  // Get structured recommendations for a session
  app.get<{ Params: { id: string } }>("/session/:id/recommendations", async (req, reply) => {
    const sessionResult = await db.query(
      `SELECT cs.*, q.diet_type, q.water_ml_per_day, q.sleep_hours, q.smoking,
              q.alcohol_frequency, q.exercise_frequency, q.stress_level, q.sun_exposure
       FROM chat_sessions cs
       LEFT JOIN questionnaires q ON q.session_id = cs.id
       WHERE cs.id = $1 AND cs.user_id = $2`,
      [req.params.id, req.userId]
    );
    if (!sessionResult.rows[0]) return reply.code(404).send({ error: "Not found", code: "NOT_FOUND" });

    const existing = await db.query(
      `SELECT * FROM recommendations WHERE session_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [req.params.id]
    );
    if (existing.rows[0]) return existing.rows[0];

    const s = sessionResult.rows[0];
    const questionnaire = {
      diet: s.diet_type ?? "not provided",
      water: s.water_ml_per_day ? `${s.water_ml_per_day}ml` : "not provided",
      sleep: s.sleep_hours ? `${s.sleep_hours} hours` : "not provided",
      smoking: s.smoking !== null ? String(s.smoking) : "not provided",
      alcohol: s.alcohol_frequency ?? "not provided",
      exercise: s.exercise_frequency ?? "not provided",
      stress: s.stress_level ?? "not provided",
      sun_exposure: s.sun_exposure ?? "not provided",
    };

    const recs = await generateRecommendations(s.skin_concern_text ?? "", questionnaire);

    await db.query(
      `INSERT INTO recommendations (session_id, home_remedies, routine_changes, habit_suggestions, products, exercises)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.id, JSON.stringify([recs]), JSON.stringify({}), JSON.stringify([]), JSON.stringify([]), JSON.stringify([])]
    );

    return { recommendations: recs };
  });
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add api/src/routes/chat.ts api/tests/chat.test.ts
git commit -m "feat: chat routes with SSE streaming and recommendations"
```

---

### Task 11: Chat UI components

**Files:**
- Create: `frontend/src/components/chat/MessageBubble.tsx`
- Create: `frontend/src/components/chat/ChatInput.tsx`
- Create: `frontend/src/components/chat/ChatWindow.tsx`
- Create: `frontend/src/app/chat/page.tsx`

- [ ] **Step 1: Create frontend/src/components/chat/MessageBubble.tsx**

```tsx
// frontend/src/components/chat/MessageBubble.tsx
import { Message } from "@/types";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 12,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "#6366f1",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, marginRight: 8, flexShrink: 0, alignSelf: "flex-end",
        }}>🌿</div>
      )}
      <div style={{
        maxWidth: "75%", padding: "10px 14px", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "#6366f1" : "#1e293b",
        color: "#f1f5f9", fontSize: 15, lineHeight: 1.6, whiteSpace: "pre-wrap",
      }}>
        {message.imageUrl && (
          <img src={message.imageUrl} alt="Uploaded skin" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8 }} />
        )}
        {message.content}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create frontend/src/components/chat/ChatInput.tsx**

```tsx
// frontend/src/components/chat/ChatInput.tsx
"use client";
import { useRef, useState } from "react";

interface Props {
  onSend: (text: string, imageBase64?: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setPreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !imageBase64) return;
    onSend(text, imageBase64 ?? undefined);
    setText("");
    setPreview(null);
    setImageBase64(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form onSubmit={submit} style={{ padding: "12px 16px", borderTop: "1px solid #1e293b" }}>
      {preview && (
        <div style={{ marginBottom: 8, position: "relative", display: "inline-block" }}>
          <img src={preview} alt="preview" style={{ height: 60, borderRadius: 8 }} />
          <button type="button" onClick={() => { setPreview(null); setImageBase64(null); }}
            style={{ position: "absolute", top: -8, right: -8, background: "#ef4444", border: "none",
              borderRadius: "50%", width: 20, height: 20, cursor: "pointer", color: "#fff", fontSize: 12 }}>×</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={() => fileRef.current?.click()}
          style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
            padding: "8px 12px", cursor: "pointer", color: "#94a3b8", fontSize: 18 }} title="Upload skin photo">
          📷
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handleImage} style={{ display: "none" }} />
        <input value={text} onChange={e => setText(e.target.value)}
          placeholder="Describe your skin concern or type a message..."
          disabled={disabled}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #334155",
            background: "#1e293b", color: "#f1f5f9", fontSize: 15 }}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(e); } }}
        />
        <button type="submit" disabled={disabled || (!text.trim() && !imageBase64)}
          style={{ background: "#6366f1", border: "none", borderRadius: 8, padding: "10px 16px",
            cursor: "pointer", color: "#fff", fontSize: 15, opacity: disabled ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Create frontend/src/components/chat/ChatWindow.tsx**

```tsx
// frontend/src/components/chat/ChatWindow.tsx
"use client";
import { useEffect, useRef } from "react";
import { Message } from "@/types";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  streaming?: string;
}

export function ChatWindow({ messages, streaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
      {messages.length === 0 && (
        <div style={{ textAlign: "center", color: "#475569", paddingTop: 80 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🌿</div>
          <h2 style={{ margin: "0 0 8px", color: "#94a3b8" }}>Welcome to SkinSage</h2>
          <p style={{ fontSize: 14, color: "#475569" }}>
            Upload a photo of your skin concern or describe it in words to get started.
          </p>
        </div>
      )}
      {messages.map(m => <MessageBubble key={m.id} message={m} />)}
      {streaming && (
        <MessageBubble message={{
          id: "streaming", role: "assistant", content: streaming + "▋", createdAt: new Date().toISOString()
        }} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 4: Create frontend/src/app/chat/page.tsx**

```tsx
// frontend/src/app/chat/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatInput } from "@/components/chat/ChatInput";
import { Message } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) { router.push("/auth"); return; }
    createSession();
  }, []);

  async function createSession() {
    const res = await fetch(`${API}/chat/session`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (res.status === 401) { router.push("/auth"); return; }
    const data = await res.json();
    setSessionId(data.id);
  }

  async function sendMessage(text: string, imageBase64?: string) {
    if (!sessionId || loading) return;
    setLoading(true);

    const userMsg: Message = {
      id: crypto.randomUUID(), role: "user", content: text,
      imageUrl: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    const res = await fetch(`${API}/chat/session/${sessionId}/message`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text, imageBase64 }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = JSON.parse(line.slice(6));
        if (data.done) break;
        fullText += data.text;
        setStreaming(fullText);
      }
    }

    const assistantMsg: Message = {
      id: crypto.randomUUID(), role: "assistant", content: fullText, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setStreaming("");
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 800, margin: "0 auto" }}>
      <header style={{ padding: "14px 16px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 18 }}>🌿 SkinSage</span>
        <button onClick={() => { router.push("/progress"); }}
          style={{ background: "transparent", border: "1px solid #334155", borderRadius: 8, padding: "6px 12px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
          Progress
        </button>
      </header>
      <ChatWindow messages={messages} streaming={streaming} />
      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/chat/ frontend/src/app/chat/
git commit -m "feat: chat UI with SSE streaming and image upload"
```

---

## Phase 4: Doctor Discovery

### Task 12: Doctor search service and route

**Files:**
- Create: `api/src/services/doctors.ts`
- Modify: `api/src/routes/doctors.ts`
- Create: `api/tests/doctors.test.ts`
- Create: `frontend/src/components/chat/DoctorCard.tsx`

- [ ] **Step 1: Write failing test**

```typescript
// api/tests/doctors.test.ts
import { buildDoctorSearchUrl } from "../src/services/doctors";

describe("doctor search URL builder", () => {
  it("builds URL with lat/lng", () => {
    const url = buildDoctorSearchUrl({ lat: 12.9716, lng: 77.5946, apiKey: "KEY" });
    expect(url).toContain("location=12.9716%2C77.5946");
    expect(url).toContain("keyword=dermatologist");
    expect(url).toContain("key=KEY");
  });

  it("builds URL with city text search", () => {
    const url = buildDoctorSearchUrl({ city: "Bangalore", apiKey: "KEY" });
    expect(url).toContain("dermatologist");
    expect(url).toContain("Bangalore");
  });
});
```

- [ ] **Step 2: Run test — verify it fails**

```bash
cd api && npx jest tests/doctors.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create api/src/services/doctors.ts**

```typescript
// api/src/services/doctors.ts
import { config } from "../config";

interface NearbyParams {
  lat?: number;
  lng?: number;
  city?: string;
  apiKey?: string;
}

export function buildDoctorSearchUrl(params: NearbyParams): string {
  const key = params.apiKey ?? config.GOOGLE_PLACES_API_KEY;
  if (params.lat !== undefined && params.lng !== undefined) {
    const loc = encodeURIComponent(`${params.lat},${params.lng}`);
    return `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${loc}&radius=5000&keyword=dermatologist&key=${key}`;
  }
  const query = encodeURIComponent(`dermatologist near ${params.city}`);
  return `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${key}`;
}

export interface DoctorResult {
  placeId: string;
  name: string;
  rating: number;
  address: string;
  phone?: string;
  openNow?: boolean;
}

export async function searchNearbyDoctors(params: NearbyParams): Promise<DoctorResult[]> {
  const url = buildDoctorSearchUrl(params);
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places error: ${data.status}`);
  }

  return (data.results ?? []).slice(0, 10).map((p: any) => ({
    placeId: p.place_id,
    name: p.name,
    rating: p.rating ?? 0,
    address: p.vicinity ?? p.formatted_address ?? "",
    openNow: p.opening_hours?.open_now,
  }));
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
cd api && npx jest tests/doctors.test.ts
```

Expected: PASS.

- [ ] **Step 5: Replace api/src/routes/doctors.ts**

```typescript
// api/src/routes/doctors.ts
import { FastifyInstance } from "fastify";
import { searchNearbyDoctors } from "../services/doctors";
import { authGuard } from "../plugins/auth-guard";

export async function doctorRoutes(app: FastifyInstance) {
  await app.register(authGuard);

  app.get("/nearby", async (req, reply) => {
    const { lat, lng, city, pin } = req.query as {
      lat?: string; lng?: string; city?: string; pin?: string;
    };

    if (!lat && !lng && !city && !pin) {
      return reply.code(400).send({ error: "Provide lat/lng or city/pin", code: "MISSING_LOCATION" });
    }

    const doctors = await searchNearbyDoctors({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      city: city ?? pin,
    });

    return { doctors };
  });
}
```

- [ ] **Step 6: Create frontend/src/components/chat/DoctorCard.tsx**

```tsx
// frontend/src/components/chat/DoctorCard.tsx
import { Doctor } from "@/types";

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const stars = "★".repeat(Math.round(doctor.rating)) + "☆".repeat(5 - Math.round(doctor.rating));
  const practoUrl = `https://www.practo.com/search/doctors?results_type=doctor&q=${encodeURIComponent(doctor.name + " " + doctor.address)}&city=${encodeURIComponent(doctor.address.split(",").pop()?.trim() ?? "")}`;
  const justdialUrl = `https://www.justdial.com/search?q=${encodeURIComponent("dermatologist " + doctor.address)}`;
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${doctor.placeId}`;

  return (
    <div style={{
      background: "#1e293b", borderRadius: 12, padding: "14px 16px", marginBottom: 10,
      border: "1px solid #334155",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <strong style={{ fontSize: 15 }}>{doctor.name}</strong>
          <div style={{ color: "#f59e0b", fontSize: 13, marginTop: 2 }}>{stars} {doctor.rating.toFixed(1)}</div>
          <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{doctor.address}</div>
          {doctor.openNow !== undefined && (
            <div style={{ fontSize: 12, color: doctor.openNow ? "#22c55e" : "#ef4444", marginTop: 4 }}>
              {doctor.openNow ? "● Open now" : "● Closed"}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={linkStyle("#3b82f6")}>Maps</a>
        <a href={practoUrl} target="_blank" rel="noopener noreferrer" style={linkStyle("#8b5cf6")}>Practo</a>
        <a href={justdialUrl} target="_blank" rel="noopener noreferrer" style={linkStyle("#f59e0b")}>Justdial</a>
      </div>
    </div>
  );
}

function linkStyle(bg: string): React.CSSProperties {
  return {
    padding: "4px 12px", borderRadius: 6, background: bg, color: "#fff",
    fontSize: 12, textDecoration: "none", fontWeight: 600,
  };
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit
```

Expected: 0 errors in both.

- [ ] **Step 8: Commit**

```bash
git add api/src/services/doctors.ts api/src/routes/doctors.ts api/tests/doctors.test.ts frontend/src/components/chat/DoctorCard.tsx
git commit -m "feat: doctor discovery — Google Places + Practo/Justdial deep-links"
```

---

## Phase 5: Notifications

### Task 13: Notification services

**Files:**
- Create: `api/src/services/notifications/email.ts`
- Create: `api/src/services/notifications/sms.ts`
- Create: `api/src/services/notifications/push.ts`
- Create: `api/src/services/queue.ts`
- Modify: `api/src/routes/notifications.ts`

- [ ] **Step 1: Create api/src/services/notifications/email.ts**

```typescript
// api/src/services/notifications/email.ts
import { Resend } from "resend";
import { config } from "../../config";

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resend) { console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`); return; }
  await resend.emails.send({ from: "SkinSage <noreply@skinsage.app>", to, subject, html });
}

export function buildWeeklyReportEmail(name: string, tips: string[]): string {
  const tipItems = tips.map(t => `<li style="margin-bottom:8px">${t}</li>`).join("");
  return `
    <div style="font-family:system-ui;max-width:600px;margin:0 auto;padding:24px;background:#0f172a;color:#f1f5f9">
      <h1 style="color:#6366f1">🌿 Your Weekly SkinSage Report</h1>
      <p>Hi ${name},</p>
      <p>Here are your personalized skin health tips for this week:</p>
      <ul>${tipItems}</ul>
      <p style="color:#94a3b8;font-size:13px">Remember: consistency is key. Keep following your routine!</p>
      <a href="${process.env.NEXTAUTH_URL}/chat" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px">
        Check Your Progress
      </a>
    </div>
  `;
}
```

- [ ] **Step 2: Create api/src/services/notifications/sms.ts**

```typescript
// api/src/services/notifications/sms.ts
import twilio from "twilio";
import { config } from "../../config";

const client =
  config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN
    ? twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
    : null;

export async function sendSms(to: string, body: string): Promise<void> {
  if (!client || !config.TWILIO_PHONE_NUMBER) {
    console.log(`[SMS STUB] To: ${to} | Body: ${body}`);
    return;
  }
  await client.messages.create({ body, from: config.TWILIO_PHONE_NUMBER, to });
}

export const DAILY_NUDGE_TEMPLATES = [
  "🌿 SkinSage reminder: Did you apply sunscreen today? Protect your skin!",
  "💧 SkinSage reminder: Stay hydrated! Your skin will thank you.",
  "🌙 SkinSage reminder: Don't forget your night skincare routine before bed.",
  "🥗 SkinSage reminder: Eating antioxidant-rich foods today helps your skin glow!",
  "😴 SkinSage reminder: Good sleep = great skin. Aim for 7-8 hours tonight.",
];
```

- [ ] **Step 3: Create api/src/services/notifications/push.ts**

```typescript
// api/src/services/notifications/push.ts
import admin from "firebase-admin";
import { config } from "../../config";

let initialized = false;

function getApp() {
  if (!initialized && config.FIREBASE_PROJECT_ID && config.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.FIREBASE_PROJECT_ID,
        privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: config.FIREBASE_CLIENT_EMAIL,
      }),
    });
    initialized = true;
  }
  return initialized ? admin : null;
}

export async function sendPush(fcmToken: string, title: string, body: string): Promise<void> {
  const app = getApp();
  if (!app) { console.log(`[PUSH STUB] Token: ${fcmToken} | ${title}: ${body}`); return; }
  await app.messaging().send({ token: fcmToken, notification: { title, body } });
}
```

- [ ] **Step 4: Create api/src/services/queue.ts**

```typescript
// api/src/services/queue.ts
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "../config";
import { sendEmail, buildWeeklyReportEmail } from "./notifications/email";
import { sendSms, DAILY_NUDGE_TEMPLATES } from "./notifications/sms";
import { sendPush } from "./notifications/push";
import { db } from "../db/client";

const connection = new IORedis(config.REDIS_URL, { maxRetriesPerRequest: null });

export const notificationQueue = new Queue("notifications", { connection });

export function startNotificationWorker() {
  new Worker(
    "notifications",
    async (job) => {
      const { userId, type, template } = job.data;

      const userResult = await db.query(
        `SELECT name, email, phone, fcm_token FROM users WHERE id = $1`,
        [userId]
      );
      const user = userResult.rows[0];
      if (!user) return;

      if (type === "email" && user.email) {
        const html = buildWeeklyReportEmail(user.name, [template]);
        await sendEmail(user.email, "Your Weekly SkinSage Report", html);
      } else if (type === "sms" && user.phone) {
        const msg = DAILY_NUDGE_TEMPLATES[Math.floor(Math.random() * DAILY_NUDGE_TEMPLATES.length)];
        await sendSms(user.phone, msg);
      } else if (type === "push" && user.fcm_token) {
        await sendPush(user.fcm_token, "SkinSage", template);
      }

      await db.query(
        `UPDATE notification_jobs SET status = 'sent', sent_at = NOW() WHERE user_id = $1 AND type = $2 AND status = 'pending' LIMIT 1`,
        [userId, type]
      );
    },
    { connection, attempts: 3, backoff: { type: "exponential", delay: 60000 } }
  );
}
```

- [ ] **Step 5: Replace api/src/routes/notifications.ts**

```typescript
// api/src/routes/notifications.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client";
import { notificationQueue } from "../services/queue";
import { authGuard } from "../plugins/auth-guard";

const prefsSchema = z.object({
  notification_email: z.boolean().optional(),
  notification_sms: z.boolean().optional(),
  notification_push: z.boolean().optional(),
  notification_frequency: z.enum(["daily", "weekly"]).optional(),
  fcm_token: z.string().optional(),
});

export async function notificationRoutes(app: FastifyInstance) {
  await app.register(authGuard);

  app.put("/notifications", async (req, reply) => {
    const body = prefsSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }
    const fields = Object.entries(body.data)
      .filter(([, v]) => v !== undefined)
      .map(([k], i) => `${k} = $${i + 2}`)
      .join(", ");
    const values = Object.values(body.data).filter(v => v !== undefined);

    if (!fields) return reply.code(400).send({ error: "No fields to update", code: "EMPTY_UPDATE" });

    await db.query(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $1`,
      [req.userId, ...values]
    );
    return { message: "Preferences updated" };
  });

  app.post("/notifications/test", async (req, reply) => {
    const { type } = req.body as { type?: "email" | "sms" | "push" };
    if (!type || !["email", "sms", "push"].includes(type)) {
      return reply.code(400).send({ error: "type must be email, sms, or push", code: "VALIDATION_ERROR" });
    }
    await notificationQueue.add("test", {
      userId: req.userId, type, template: "This is a test notification from SkinSage!",
    });
    return { message: "Test notification queued" };
  });
}
```

- [ ] **Step 6: Start worker in index.ts — add after runMigrations()**

In `api/src/index.ts`, add after the `runMigrations()` call:

```typescript
import { startNotificationWorker } from "./services/queue";

// inside main(), after runMigrations():
startNotificationWorker();
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add api/src/services/notifications/ api/src/services/queue.ts api/src/routes/notifications.ts api/src/index.ts
git commit -m "feat: notifications — email (Resend), SMS (Twilio), push (FCM) + BullMQ queue"
```

---

## Phase 6: Progress Tracking

### Task 14: Progress routes and UI

**Files:**
- Create: `api/src/services/storage.ts`
- Modify: `api/src/routes/progress.ts`
- Create: `frontend/src/components/progress/ProgressForm.tsx`
- Create: `frontend/src/components/progress/ProgressList.tsx`
- Create: `frontend/src/app/progress/page.tsx`

- [ ] **Step 1: Create api/src/services/storage.ts**

```typescript
// api/src/services/storage.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config";

const s3 = config.R2_ENDPOINT
  ? new S3Client({
      region: "auto",
      endpoint: config.R2_ENDPOINT,
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY ?? "",
        secretAccessKey: config.R2_SECRET_KEY ?? "",
      },
    })
  : null;

export async function uploadImage(buffer: Buffer, key: string, mimeType: string): Promise<string> {
  if (!s3 || !config.R2_BUCKET) {
    console.log(`[STORAGE STUB] Would upload ${key}`);
    return `https://placeholder.skinsage.app/${key}`;
  }
  await s3.send(
    new PutObjectCommand({ Bucket: config.R2_BUCKET, Key: key, Body: buffer, ContentType: mimeType })
  );
  return `${config.R2_ENDPOINT}/${config.R2_BUCKET}/${key}`;
}
```

- [ ] **Step 2: Replace api/src/routes/progress.ts**

```typescript
// api/src/routes/progress.ts
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client";
import { uploadImage } from "../services/storage";
import { authGuard } from "../plugins/auth-guard";

const logSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  photoBase64: z.string().optional(),
});

export async function progressRoutes(app: FastifyInstance) {
  await app.register(authGuard);

  app.post("/", async (req, reply) => {
    const body = logSchema.safeParse(req.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid input", code: "VALIDATION_ERROR" });
    }

    let photoUrl: string | undefined;
    if (body.data.photoBase64) {
      const buf = Buffer.from(body.data.photoBase64, "base64");
      const key = `progress/${req.userId}/${Date.now()}.jpg`;
      photoUrl = await uploadImage(buf, key, "image/jpeg");
    }

    const result = await db.query(
      `INSERT INTO progress_logs (user_id, date, notes, rating, photo_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, body.data.date, body.data.notes, body.data.rating, photoUrl]
    );
    return reply.code(201).send(result.rows[0]);
  });

  app.get("/", async (req) => {
    const result = await db.query(
      `SELECT * FROM progress_logs WHERE user_id = $1 ORDER BY date DESC`,
      [req.userId]
    );
    return { logs: result.rows };
  });
}
```

- [ ] **Step 3: Create frontend/src/components/progress/ProgressForm.tsx**

```tsx
// frontend/src/components/progress/ProgressForm.tsx
"use client";
import { useState } from "react";

interface Props {
  onSaved: () => void;
  token: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function ProgressForm({ onSaved, token }: Props) {
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState("");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoBase64((ev.target?.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`${API}/progress`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ date: new Date().toISOString().slice(0, 10), notes, rating, photoBase64 }),
    });
    setSaving(false);
    setNotes("");
    setPhotoBase64(null);
    onSaved();
  }

  return (
    <form onSubmit={submit} style={{ background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 16px" }}>Log Today's Progress</h3>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13, color: "#94a3b8" }}>
          Skin rating today
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => setRating(n)}
              style={{
                width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
                background: rating >= n ? "#f59e0b" : "#0f172a", fontSize: 16,
              }}>
              {n <= rating ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>
      <textarea value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="How is your skin feeling? Any improvements or concerns?"
        rows={3}
        style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #334155",
          background: "#0f172a", color: "#f1f5f9", fontSize: 14, resize: "vertical", boxSizing: "border-box" }} />
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <label style={{ cursor: "pointer", fontSize: 13, color: "#6366f1" }}>
          📷 Add photo
          <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
        </label>
        {photoBase64 && <span style={{ fontSize: 12, color: "#22c55e" }}>✓ Photo added</span>}
      </div>
      <button type="submit" disabled={saving}
        style={{ marginTop: 14, width: "100%", padding: "10px 0", borderRadius: 8, background: "#6366f1",
          border: "none", color: "#fff", cursor: "pointer", fontSize: 15, opacity: saving ? 0.6 : 1 }}>
        {saving ? "Saving..." : "Save Progress"}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create frontend/src/components/progress/ProgressList.tsx**

```tsx
// frontend/src/components/progress/ProgressList.tsx
import { ProgressLog } from "@/types";

export function ProgressList({ logs }: { logs: ProgressLog[] }) {
  if (!logs.length) {
    return <p style={{ color: "#475569", textAlign: "center", padding: 40 }}>No progress logs yet. Start logging to track your improvement!</p>;
  }

  return (
    <div>
      {logs.map(log => (
        <div key={log.id} style={{ background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, border: "1px solid #334155" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "#94a3b8" }}>{new Date(log.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            <span style={{ color: "#f59e0b" }}>{"★".repeat(log.rating)}{"☆".repeat(5 - log.rating)}</span>
          </div>
          {log.notes && <p style={{ margin: 0, fontSize: 14, color: "#f1f5f9" }}>{log.notes}</p>}
          {log.photoUrl && <img src={log.photoUrl} alt="Progress" style={{ marginTop: 10, maxWidth: "100%", borderRadius: 8 }} />}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Create frontend/src/app/progress/page.tsx**

```tsx
// frontend/src/app/progress/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressForm } from "@/components/progress/ProgressForm";
import { ProgressList } from "@/components/progress/ProgressList";
import { ProgressLog } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ProgressPage() {
  const [logs, setLogs] = useState<ProgressLog[]>([]);
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";

  useEffect(() => {
    if (!token) { router.push("/auth"); return; }
    loadLogs();
  }, []);

  async function loadLogs() {
    const res = await fetch(`${API}/progress`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { router.push("/auth"); return; }
    const data = await res.json();
    setLogs(data.logs);
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>🌿 Skin Progress</h1>
        <button onClick={() => router.push("/chat")}
          style={{ background: "transparent", border: "1px solid #334155", borderRadius: 8, padding: "6px 14px", color: "#94a3b8", cursor: "pointer", fontSize: 13 }}>
          ← Chat
        </button>
      </div>
      <ProgressForm token={token} onSaved={loadLogs} />
      <ProgressList logs={logs} />
    </div>
  );
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd api && npx tsc --noEmit && cd ../frontend && npx tsc --noEmit
```

Expected: 0 errors in both.

- [ ] **Step 7: Commit**

```bash
git add api/src/services/storage.ts api/src/routes/progress.ts frontend/src/components/progress/ frontend/src/app/progress/
git commit -m "feat: progress tracking — log entries with photo upload"
```

---

## Phase 7: Firebase Web Push

### Task 15: FCM web push setup

**Files:**
- Create: `frontend/public/firebase-messaging-sw.js`
- Create: `frontend/src/lib/fcm.ts`

- [ ] **Step 1: Create frontend/public/firebase-messaging-sw.js**

```javascript
// frontend/public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY,
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  storageBucket: self.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon-192.png",
  });
});
```

- [ ] **Step 2: Create frontend/src/lib/fcm.ts**

```typescript
// frontend/src/lib/fcm.ts
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function initFcm() {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey) return null;
  if (!getApps().length) initializeApp(firebaseConfig);
  return getMessaging();
}

export async function requestPushToken(): Promise<string | null> {
  const messaging = initFcm();
  if (!messaging) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  return getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  });
}

export function onForegroundMessage(callback: (payload: any) => void) {
  const messaging = initFcm();
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
}
```

- [ ] **Step 3: Add Firebase public env vars to .env.example**

Add to `.env.example`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/public/firebase-messaging-sw.js frontend/src/lib/fcm.ts .env.example
git commit -m "feat: Firebase FCM web push setup"
```

---

## Phase 8: E2E Test & Docker Verification

### Task 16: Playwright E2E test

**Files:**
- Create: `frontend/tests/e2e/chat-flow.spec.ts`
- Create: `frontend/playwright.config.ts`

- [ ] **Step 1: Create frontend/playwright.config.ts**

```typescript
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000", headless: true },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true },
});
```

- [ ] **Step 2: Create frontend/tests/e2e/chat-flow.spec.ts**

```typescript
// frontend/tests/e2e/chat-flow.spec.ts
import { test, expect } from "@playwright/test";

test.describe("SkinSage auth flow", () => {
  test("redirects unauthenticated user to /auth", async ({ page }) => {
    await page.goto("/chat");
    await expect(page).toHaveURL(/\/auth/);
  });

  test("auth page shows email and phone tabs", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByText("Email / Social")).toBeVisible();
    await expect(page.getByText("Phone OTP")).toBeVisible();
  });

  test("phone tab switches to phone form", async ({ page }) => {
    await page.goto("/auth");
    await page.getByText("Phone OTP").click();
    await expect(page.getByPlaceholder("+91 9876543210")).toBeVisible();
  });
});

test.describe("SkinSage chat UI (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    // Register a test user
    const res = await page.request.post("http://localhost:4000/auth/register", {
      data: { name: "Test User", email: `test-${Date.now()}@example.com`, password: "password123" },
    });
    const { token } = await res.json();
    await page.goto("/chat");
    await page.evaluate((t) => localStorage.setItem("token", t), token);
    await page.reload();
  });

  test("chat page loads with welcome message", async ({ page }) => {
    await expect(page.getByText("Welcome to SkinSage")).toBeVisible();
  });

  test("send button is present", async ({ page }) => {
    await expect(page.getByText("Send")).toBeVisible();
  });

  test("image upload button is present", async ({ page }) => {
    await expect(page.getByTitle("Upload skin photo")).toBeVisible();
  });
});
```

- [ ] **Step 3: Run E2E tests (requires running API + frontend)**

```bash
# Terminal 1: start docker-compose
docker-compose up postgres redis api

# Terminal 2: start frontend dev server
cd frontend && npm run dev

# Terminal 3: run E2E tests
cd frontend && npx playwright install chromium && npx playwright test
```

Expected: All 5 tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/tests/ frontend/playwright.config.ts
git commit -m "test: Playwright E2E tests for auth flow and chat UI"
```

---

### Task 17: Full Docker build verification

**Files:**
- No new files — verify existing Dockerfiles build cleanly.

- [ ] **Step 1: Build API Docker image**

```bash
cd api && docker build -t skinsage-api .
```

Expected: Build succeeds, image created.

- [ ] **Step 2: Build frontend Docker image**

```bash
cd frontend && docker build -t skinsage-frontend .
```

Expected: Build succeeds, image created.

- [ ] **Step 3: Start full stack with docker-compose**

```bash
docker-compose up --build
```

Expected: All 4 containers start. Visit http://localhost:3000 — redirects to /auth. Visit http://localhost:4000/health — returns `{"status":"ok"}`.

- [ ] **Step 4: Smoke test the API**

```bash
# Register a user
curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"password123"}' | jq .
```

Expected: `{"token":"<jwt>","user":{"id":"...","name":"Test","email":"test@test.com"}}`

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "chore: verified full Docker build and smoke test"
```

---

## Summary

| Phase | Tasks | What it builds |
|-------|-------|----------------|
| 1 | 1–4 | Project scaffold, Docker, TypeScript setup |
| 2 | 5–8 | Database migrations, auth (email + phone OTP), auth UI |
| 3 | 9–11 | Claude AI service, SSE streaming, chat UI |
| 4 | 12 | Doctor discovery (Google Places + deep-links) |
| 5 | 13 | Email/SMS/push notifications + BullMQ queue |
| 6 | 14 | Progress tracking with photo upload |
| 7 | 15 | Firebase FCM web push |
| 8 | 16–17 | E2E tests + Docker verification |

**Environment variables to configure before running:**
- `ANTHROPIC_API_KEY` — required for all AI features
- `GOOGLE_PLACES_API_KEY` — required for doctor search
- `JWT_SECRET` — required (any random string, min 32 chars)
- All others (Twilio, Resend, Firebase, R2) — optional; app logs stubs when missing
