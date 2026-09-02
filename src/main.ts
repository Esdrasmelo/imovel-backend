import "reflect-metadata";
import { container } from "tsyringe";
import { env } from "./shared/config/env.ts";
import { logger } from "./shared/utils/logger.ts";
import { buildServer } from "./adapters/inbound/http/server.ts";

import { PrismaImovelRepository } from "./adapters/outbound/persistence/PrismaImovelRepository.ts";
import { PrismaColetaRepository } from "./adapters/outbound/persistence/PrismaColetaRepository.ts";
import { PrismaFonteDadosRepository } from "./adapters/outbound/persistence/PrismaFonteDadosRepository.ts";

import { BuscaService } from "./application/services/BuscaService.ts";
import { ColetaService } from "./application/services/ColetaService.ts";
import { PARAMETROS_DE_COLETA, type ParametrosDeColeta } from "./application/ParametrosDeColeta.ts";
import { AreaDeBusca } from "./domain/busca/value-objects/AreaDeBusca.ts";

import type { ScraperPort } from "./ports/outbound/ScraperPort.ts";
import { MendesOrtegaScraper } from "./adapters/outbound/scrapers/mendesortega/MendesOrtegaScraper.ts";
import { ZapImoveisScraper } from "./adapters/outbound/scrapers/zapimoveis/ZapImoveisScraper.ts";
import { VivaRealScraper } from "./adapters/outbound/scrapers/vivareal/VivaRealScraper.ts";
import { PlanetaScraper } from "./adapters/outbound/scrapers/planeta/PlanetaScraper.ts";
import { MrvScraper } from "./adapters/outbound/scrapers/mrv/MrvScraper.ts";

const area = AreaDeBusca.criar(env.CIDADE, env.ESTADO);

const parametrosDeColeta: ParametrosDeColeta = {
  area,
  tipoNegocio: "VENDA",
  precoMaximo: env.PRECO_MAXIMO_COLETA,
};

const scrapers: ScraperPort[] = [
  new MendesOrtegaScraper(area),
  new ZapImoveisScraper(area),
  new VivaRealScraper(area),
  new PlanetaScraper(area),
  new MrvScraper(),
];

container.register("ImovelRepository", { useClass: PrismaImovelRepository });
container.register("ColetaRepository", { useClass: PrismaColetaRepository });
container.register("FonteDadosRepository", { useClass: PrismaFonteDadosRepository });
container.register("Scrapers", { useValue: scrapers });
container.register(PARAMETROS_DE_COLETA, { useValue: parametrosDeColeta });
container.register("BuscaService", { useClass: BuscaService });
container.register("ColetaService", { useClass: ColetaService });

async function bootstrap() {
  const buscaService = container.resolve<BuscaService>("BuscaService");
  const coletaService = container.resolve<ColetaService>("ColetaService");

  const server = await buildServer({ buscaService, coletaService });
  await server.listen({ port: env.PORT, host: env.HOST });

  logger.info(
    { port: env.PORT, host: env.HOST, env: env.NODE_ENV, area },
    `Servidor rodando em http://${env.HOST}:${env.PORT}`,
  );
  logger.info(`Documentacao em http://${env.HOST}:${env.PORT}/docs`);
}

bootstrap().catch((error) => {
  logger.fatal({ error }, "Falha ao iniciar o servidor");
  process.exit(1);
});
