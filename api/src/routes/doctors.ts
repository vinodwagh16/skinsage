import { FastifyInstance } from "fastify";
import { searchNearbyDoctors } from "../services/doctors";
import { authGuard } from "../plugins/auth-guard";

export async function doctorRoutes(app: FastifyInstance) {
  await app.register(authGuard);

  app.get("/nearby", async (req, reply) => {
    const { lat, lng, city, pin } = req.query as {
      lat?: string; lng?: string; city?: string; pin?: string;
    };

    if (!lat && !lng && !city && !pin) {
      return reply.code(400).send({ error: "Provide lat/lng or city/pin", code: "MISSING_LOCATION" });
    }

    const doctors = await searchNearbyDoctors({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      city: city ?? pin,
    });

    return { doctors };
  });
}
