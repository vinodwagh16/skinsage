import { FastifyInstance } from "fastify";
export async function notificationRoutes(app: FastifyInstance) {
  app.get("/ping", async () => ({ route: "notifications" }));
}
