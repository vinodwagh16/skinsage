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
    const entries = Object.entries(body.data).filter(([, v]) => v !== undefined);
    if (!entries.length) return reply.code(400).send({ error: "No fields to update", code: "EMPTY_UPDATE" });

    const fields = entries.map(([k], i) => `${k} = $${i + 2}`).join(", ");
    const values = entries.map(([, v]) => v);

    await db.query(
      `UPDATE users SET ${fields}, updated_at = NOW() WHERE id = $1`,
      [req.userId, ...values]
    );
    return { message: "Preferences updated" };
  });

  app.post("/notifications/test", async (req, reply) => {
    const { type } = req.body as { type?: string };
    if (!type || !["email", "sms", "push"].includes(type)) {
      return reply.code(400).send({ error: "type must be email, sms, or push", code: "VALIDATION_ERROR" });
    }
    await notificationQueue.add("test", {
      userId: req.userId, type, template: "This is a test notification from SkinSage!",
    });
    return { message: "Test notification queued" };
  });
}
