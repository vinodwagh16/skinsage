import { FastifyInstance } from "fastify";
import { db } from "../db/client";
import { streamChatResponse, streamVisionResponse, generateRecommendations } from "../services/claude";
import { SKIN_ANALYSIS_SYSTEM } from "../prompts/skin-analysis";
import { authGuard } from "../plugins/auth-guard";

export async function chatRoutes(app: FastifyInstance) {
  await app.register(authGuard);

  app.post("/session", async (req, reply) => {
    const result = await db.query(
      `INSERT INTO chat_sessions (user_id) VALUES ($1) RETURNING id, created_at`,
      [req.userId]
    );
    return reply.code(201).send(result.rows[0]);
  });

  app.get<{ Params: { id: string } }>("/session/:id", async (req, reply) => {
    const result = await db.query(
      `SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (!result.rows[0]) return reply.code(404).send({ error: "Session not found", code: "NOT_FOUND" });
    return result.rows[0];
  });

  app.post<{ Params: { id: string } }>("/session/:id/message", async (req, reply) => {
    const session = await db.query(
      `SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.userId]
    );
    if (!session.rows[0]) return reply.code(404).send({ error: "Session not found", code: "NOT_FOUND" });

    const body = req.body as { text?: string; imageBase64?: string };
    const userMessage = { role: "user" as const, content: body.text ?? "" };

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

    const assistantMsg = { role: "assistant", content: fullResponse, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    await db.query(
      `UPDATE chat_sessions SET messages = messages || $1::jsonb WHERE id = $2`,
      [JSON.stringify([assistantMsg]), req.params.id]
    );

    reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    reply.raw.end();
  });

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
