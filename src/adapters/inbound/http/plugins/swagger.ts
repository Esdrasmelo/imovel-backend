import type { FastifyInstance } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export async function registerSwagger(app: FastifyInstance) {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Imovel Backend",
        description: "API de coleta e busca de imóveis a partir de fontes públicas, com área de busca configurável",
        version: "1.0.0",
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });
}
