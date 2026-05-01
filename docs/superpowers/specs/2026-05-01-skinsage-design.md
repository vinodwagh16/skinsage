# SkinSage — Design Spec

**Date:** 2026-05-01
**Status:** Approved

---

## Overview

SkinSage is a conversational AI-powered skin health chatbot web application. Users upload a skin photo or describe their skin concern, and the app guides them through a personalized health improvement journey — from home remedies and routine changes to OTC product recommendations and nearby dermatologist discovery. The app follows up with users via notifications to track progress.

The web app ships as a Docker image first. The backend API is designed for reuse by future Android and iOS native apps.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript |
| Backend API | Node.js + Fastify, TypeScript |
| AI | Claude API (claude-sonnet-4-6), multimodal vision |
| Database | PostgreSQL |
| Cache / Queue | Redis |
| Auth | NextAuth.js (email/password, Google OAuth, Apple OAuth) + Twilio Verify (phone OTP) |
| Email notifications | Resend |
| SMS notifications | Twilio |
| Web Push notifications | Firebase Cloud Messaging (FCM) |
| Doctor discovery | Google Places API + Practo/Justdial deep-links |
| Containerization | Docker + docker-compose |

---

## Architecture

Two Docker containers orchestrated via `docker-compose`:

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Container 1: Frontend  │        │   Container 2: API Server    │
│  Next.js 14 (port 3000) │◄──────►│   Node.js + Fastify (4000)   │
└─────────────────────────┘        └──────────────────────────────┘
                                            │
                  ┌─────────────────────────┼─────────────────────────┐
                  ▼                         ▼                         ▼
          Claude API               PostgreSQL + Redis         Google Places API
         (AI + Vision)             (data + sessions)          (doctor search)
```

- Frontend communicates with the API via REST (HTTP) and SSE/Server-Sent Events (chat streaming).
- The API server holds all business logic — AI calls, auth, notifications, doctor search, scheduling.
- Redis is used for session storage and as a job queue for scheduled notifications.
- The API is the single backend consumed by the web frontend now, and native mobile apps in the future.

---

## Core User Flow

All interaction happens within a **unified chat interface** (no wizard steps or page transitions):

1. **Skin Assessment** — User uploads a photo of their skin concern or types a description. Claude performs initial multimodal analysis and responds conversationally.
2. **Lifestyle Questionnaire** — The chatbot asks follow-up questions one at a time: daily skincare routine, diet type, water intake, sleep hours, smoking/alcohol habits, exercise frequency, stress level, and sun exposure.
3. **Personalized Recommendations** — Claude generates a structured recommendation set, delivered in the chat in this order:
   - Home remedies (immediate, zero-cost actions)
   - Daily routine changes (morning/night skincare steps)
   - Exercise and habit suggestions
   - OTC product recommendations (no prescription required, e.g. sunscreen, moisturizers, serums)
4. **Nearby Dermatologists** — App asks for location (GPS or manual city/PIN entry) and shows nearby dermatologists from Google Places with ratings, address, and deep-links to their Practo/Justdial profiles.
5. **Notification Opt-in** — User chooses follow-up notification frequency (daily, weekly) and channels (email, SMS, web push).
6. **Progress Tracking** — User can return to the app to log progress: notes, rating (1–5), and optional follow-up photo. The chatbot reviews logs and adjusts recommendations over time.

---

## Features

### Skin Analysis
- Accept image upload (JPEG/PNG, max 10MB) or free-text description
- Claude multimodal vision identifies visible skin concerns (dryness, acne, pigmentation, etc.)
- Analysis is conversational — Claude asks clarifying questions naturally in chat

### Lifestyle Questionnaire
Collected via natural chat questions:
- Daily skincare routine (products currently used)
- Diet type (vegetarian, non-veg, vegan, junk-heavy)
- Daily water intake (ml/glasses)
- Sleep hours and quality
- Smoking (yes/no/frequency)
- Alcohol consumption (frequency)
- Exercise frequency
- Stress level (low/medium/high)
- Sun exposure level

### Recommendations Engine
Claude generates personalized recommendations in priority order:
1. **Home remedies** — ingredient-based (aloe vera, turmeric, honey, etc.)
2. **Routine changes** — step-by-step morning and night skincare routine
3. **Habit improvements** — sleep, hydration, dietary tweaks, exercise suggestions
4. **OTC products** — specific product categories and well-known brands available without prescription (sunscreens, moisturizers, face washes, vitamin C serums, etc.)

### Doctor Discovery
- Location via GPS (browser geolocation) with fallback to manual city/PIN code entry
- Google Places API query: "dermatologist near [location]"
- Results show: name, rating, address, phone, hours
- Deep-link buttons to open doctor profile on Practo and Justdial
- Upgrade path: full Practo API integration when partnership is established

### Notifications
Three channels, all opt-in:

| Channel | Service | Use |
|---------|---------|-----|
| Email | Resend | Weekly skin health report, tips |
| SMS | Twilio | Daily nudges ("Applied sunscreen today?"), OTP auth |
| Web Push | Firebase FCM | In-browser push alerts, groundwork for mobile push |

Notification jobs are stored in PostgreSQL and dispatched via a Redis-backed queue (BullMQ). Users can configure frequency and pause/resume from their settings.

### Authentication
Two registration paths — both create the same account type:
- **Email/password + social login** — email + bcrypt password, Google OAuth, Apple OAuth via NextAuth.js
- **Phone number** — SMS OTP via Twilio Verify

Users can add both email and phone to a single account for redundancy.

### Progress Tracking
- Users log progress entries: date, text notes, skin rating (1–5 stars), optional photo
- Photos stored in cloud object storage (S3-compatible, e.g. Cloudflare R2)
- Claude reviews progress history when generating updated recommendations on return visits

---

## Database Schema

### `users`
```
id, name, email, phone, auth_methods (JSONB array: ["email","phone","google","apple"]), location_city, location_pin,
notification_email, notification_sms, notification_push,
notification_frequency, fcm_token, created_at, updated_at
```

### `chat_sessions`
```
id, user_id, messages (JSONB array), skin_concern_text, skin_image_url,
questionnaire_complete (bool), created_at
```

### `questionnaires`
```
id, session_id, diet_type, water_ml_per_day, sleep_hours,
smoking (bool), alcohol_frequency, exercise_frequency,
stress_level, sun_exposure, created_at
```

### `recommendations`
```
id, session_id, home_remedies (JSONB), routine_changes (JSONB),
habit_suggestions (JSONB), products (JSONB), exercises (JSONB),
generated_at
```

### `progress_logs`
```
id, user_id, date, notes, rating (1-5), photo_url, created_at
```

### `notification_jobs`
```
id, user_id, type (email|sms|push), template, scheduled_at,
sent_at, status (pending|sent|failed), created_at
```

---

## API Endpoints

### Auth
- `POST /auth/register` — email/password registration
- `POST /auth/login` — email/password login
- `POST /auth/phone/send-otp` — send SMS OTP
- `POST /auth/phone/verify-otp` — verify OTP and issue session
- OAuth handled by NextAuth.js on frontend

### Chat
- `POST /chat/session` — create new chat session
- `POST /chat/session/:id/message` — send message (text or image), streams Claude response via SSE
- `GET /chat/session/:id` — get session history

### Recommendations
- `GET /chat/session/:id/recommendations` — get structured recommendations for a session

### Doctors
- `GET /doctors/nearby?lat=&lng=` — Google Places search by coordinates
- `GET /doctors/nearby?city=&pin=` — Google Places search by city/PIN

### Notifications
- `PUT /user/notifications` — update notification preferences
- `POST /user/notifications/test` — send a test notification

### Progress
- `POST /progress` — create progress log entry
- `GET /progress` — list user's progress logs

---

## Docker Setup

```
docker-compose.yml
  ├── frontend (Next.js, port 3000)
  ├── api (Node.js/Fastify, port 4000)
  ├── postgres (port 5432)
  └── redis (port 6379)
```

Environment variables passed via `.env` file:
- `ANTHROPIC_API_KEY`
- `GOOGLE_PLACES_API_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- `RESEND_API_KEY`
- `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`
- `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`
- `DATABASE_URL`, `REDIS_URL`
- `R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_ENDPOINT` (for image storage)

---

## Error Handling

- All API endpoints return structured JSON errors: `{ error: string, code: string }`
- Claude API failures fall back to a graceful message asking the user to retry
- Image upload failures show inline error in chat
- Notification delivery failures are retried up to 3 times via BullMQ retry logic
- Location permission denied → automatic fallback to manual city/PIN entry

---

## Testing Strategy

- **Unit tests**: Jest for utility functions, Claude prompt builders, recommendation formatters
- **Integration tests**: Supertest against Fastify API with a test PostgreSQL database
- **E2E tests**: Playwright for the full chat flow (upload → questionnaire → recommendations)
- **CI**: GitHub Actions running tests + Docker build on every push

---

## Future Mobile Path

When building Android/iOS apps:
1. The Node.js API server is consumed as-is — no changes needed
2. React Native frontend replaces Next.js frontend only
3. Firebase FCM token registration already supported in the API
4. Push notifications work natively via the same FCM setup
5. Full Practo API integration can be added to the existing `/doctors` endpoint

---

## Out of Scope (v1)

- Clinical diagnosis or medical advice (app always disclaims it is not a substitute for professional medical care)
- Full Practo API integration (deep-links only in v1)
- Telemedicine / video consultation booking
- Paid subscription / in-app purchases
- Multi-language support
