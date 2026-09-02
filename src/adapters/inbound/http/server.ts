import Fastify from "fastify";
import { registerCors } from "./plugins/cors.ts";
import { registerErrorHandler } from "./plugins/error-handler.ts";
import { registerSwagger } from "./plugins/swagger.ts";
import { healthRoutes } from "./routes/health.routes.ts";
import { buscaRoutes } from "./routes/busca.routes.ts";
import { coletaRoutes } from "./routes/coleta.routes.ts";
import type { BuscaServicePort } from "../../../ports/inbound/BuscaService.port.ts";
import type { ColetaServicePort } from "../../../ports/inbound/ColetaService.port.ts";
import { logger } from "../../../shared/utils/logger.ts";

interface BuildServerOptions {
  buscaService: BuscaServicePort;
  coletaService: ColetaServicePort;
}

export async function buildServer(options: BuildServerOptions) {
  const app = Fastify({
    logger: false,
  });

  await registerCors(app);
  await registerSwagger(app);
  registerErrorHandler(app);

  await healthRoutes(app);
  await buscaRoutes(app, options.buscaService);
  await coletaRoutes(app, options.coletaService);

  logger.info("Servidor Fastify configurado");

  return app;
}
