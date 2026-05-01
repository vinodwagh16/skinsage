import { FastifyInstance } from "fastify";
export async function doctorRoutes(app: FastifyInstance) {
  app.get("/ping", async () => ({ route: "doctors" }));
}
