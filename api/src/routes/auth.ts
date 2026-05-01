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
    // In production: send via Twilio SMS
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
