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
