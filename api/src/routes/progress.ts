import { FastifyInstance } from "fastify";
export async function progressRoutes(app: FastifyInstance) {
  app.get("/ping", async () => ({ route: "progress" }));
}
