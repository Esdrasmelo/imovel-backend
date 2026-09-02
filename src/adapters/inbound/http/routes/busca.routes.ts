import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { BuscaServicePort } from "../../../../ports/inbound/BuscaService.port.ts";
import type { FiltroBusca } from "../../../../domain/busca/value-objects/FiltroBusca.ts";
import { TipoImovel } from "../../../../domain/imovel/enums/TipoImovel.ts";
import { TipoNegocio } from "../../../../domain/imovel/enums/TipoNegocio.ts";
import { StatusConstrucao } from "../../../../domain/imovel/enums/StatusConstrucao.ts";

function splitCSV(value: string | undefined): string[] | undefined {
  return value?.split(",").map((s) => s.trim()).filter(Boolean);
}

const listaCSV = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (valor) => splitCSV(typeof valor === "string" ? valor : undefined),
    z.array(item).optional(),
  );

const querySchema = z.object({
  q: z.string().optional(),
  precoMin: z.coerce.number().optional(),
  precoMax: z.coerce.number().optional(),
  tipoImovel: listaCSV(z.enum(TipoImovel)),
  tipoNegocio: z.enum(TipoNegocio).optional(),
  statusConstrucao: listaCSV(z.enum(StatusConstrucao)),
  bairro: listaCSV(z.string()),
  construtora: listaCSV(z.string()),
  quartosMin: z.coerce.number().optional(),
  areaMin: z.coerce.number().optional(),
  aceitaFinanciamento: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  fonte: listaCSV(z.string()),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  ordenarPor: z.enum(["preco", "areaUtil", "quartos", "criadoEm"]).optional(),
  ordem: z.enum(["asc", "desc"]).optional(),
  pagina: z.coerce.number().min(1).optional(),
  tamanhoPagina: z.coerce.number().min(1).max(100).optional(),
});

const bairrosQuerySchema = z.object({
  cidade: z.string().optional(),
});

export async function buscaRoutes(app: FastifyInstance, buscaService: BuscaServicePort) {
  app.get("/api/imoveis/bairros", async (request, reply) => {
    const { cidade } = bairrosQuerySchema.parse(request.query);
    return reply.send(await buscaService.listarBairros(cidade));
  });

  app.get("/api/imoveis/construtoras", async (_request, reply) => {
    return reply.send(await buscaService.listarConstrutoras());
  });

  app.get("/api/imoveis/fontes", async (_request, reply) => {
    return reply.send(await buscaService.listarFontes());
  });

  app.get("/api/imoveis/estatisticas", async (_request, reply) => {
    return reply.send(await buscaService.obterEstatisticas());
  });

  app.get("/api/imoveis", async (request, reply) => {
    const filtros: FiltroBusca = querySchema.parse(request.query);
    return reply.send(await buscaService.buscar(filtros));
  });

  app.get<{ Params: { id: string } }>("/api/imoveis/:id", async (request, reply) => {
    const imovel = await buscaService.buscarPorId(request.params.id);
    if (!imovel) {
      return reply.status(404).send({
        statusCode: 404,
        error: "NOT_FOUND",
        message: "Imovel nao encontrado",
      });
    }
    return reply.send(imovel);
  });
}
