import type { FastifyInstance } from "fastify";
import { prisma } from "../../../../shared/config/database.ts";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/api/health", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: "ok", database: "connected" });
    } catch {
      return reply.status(503).send({ status: "error", database: "disconnected" });
    }
  });
}
