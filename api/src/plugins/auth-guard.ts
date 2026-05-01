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
