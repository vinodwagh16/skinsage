import { FastifyInstance } from "fastify";
export async function authRoutes(app: FastifyInstance) {
  app.get("/ping", async () => ({ route: "auth" }));
}
