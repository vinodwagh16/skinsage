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
