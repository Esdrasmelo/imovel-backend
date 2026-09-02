import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ColetaServicePort } from "../../../../ports/inbound/ColetaService.port.ts";

const executarBody = z.object({
  fonte: z.string().optional(),
});

const listarQuery = z.object({
  fonteId: z.string().optional(),
  limite: z.coerce.number().min(1).max(100).optional(),
});

export async function coletaRoutes(
  app: FastifyInstance,
  coletaService: ColetaServicePort,
) {
  app.post("/api/coleta/executar", async (request, reply) => {
    const body = executarBody.parse(request.body ?? {});
    const execucoes = await coletaService.executarColeta(body.fonte);
    return reply.status(201).send(execucoes);
  });

  app.get("/api/coleta/execucoes", async (request, reply) => {
    const query = listarQuery.parse(request.query);
    const execucoes = await coletaService.listarExecucoes(
      query.fonteId,
      query.limite,
    );
    return reply.send(execucoes);
  });

  app.get("/api/coleta/fontes", async (_request, reply) => {
    const status = await coletaService.obterStatusFontes();
    return reply.send(status);
  });
}
