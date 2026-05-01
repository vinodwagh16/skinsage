import { FastifyInstance } from "fastify";
export async function chatRoutes(app: FastifyInstance) {
  app.get("/ping", async () => ({ route: "chat" }));
}
