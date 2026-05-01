import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { config } from "./config";
import { runMigrations } from "./db/migrate";
import { authRoutes } from "./routes/auth";
import { chatRoutes } from "./routes/chat";
import { doctorRoutes } from "./routes/doctors";
import { notificationRoutes } from "./routes/notifications";
import { progressRoutes } from "./routes/progress";

const app = Fastify({ logger: true });

async function main() {
  await runMigrations();

  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.register(authRoutes, { prefix: "/auth" });
  app.register(chatRoutes, { prefix: "/chat" });
  app.register(doctorRoutes, { prefix: "/doctors" });
  app.register(notificationRoutes, { prefix: "/user" });
  app.register(progressRoutes, { prefix: "/progress" });

  app.get("/health", async () => ({ status: "ok" }));

  const port = Number(config.PORT);
  await app.listen({ port, host: "0.0.0.0" });

  process.on("SIGTERM", async () => {
    await app.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
