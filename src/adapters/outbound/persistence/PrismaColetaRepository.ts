import { injectable } from "tsyringe";
import { prisma } from "../../../shared/config/database.ts";
import type {
  AtualizacaoDeExecucao,
  ColetaRepositoryPort,
  ExecucaoColetaPersistida,
} from "../../../ports/outbound/ColetaRepository.port.ts";
import type { ExecucaoColetaProps } from "../../../domain/coleta/entities/ExecucaoColeta.ts";
import { StatusExecucao } from "../../../domain/coleta/entities/ExecucaoColeta.ts";

const LIMITE_PADRAO = 20;

@injectable()
export class PrismaColetaRepository implements ColetaRepositoryPort {
  async criar(fonteId: string): Promise<ExecucaoColetaPersistida> {
    const result = await prisma.execucaoColeta.create({
      data: { fonteId, status: StatusExecucao.PENDENTE },
    });
    return result as ExecucaoColetaPersistida;
  }

  async atualizar(id: string, dados: AtualizacaoDeExecucao): Promise<ExecucaoColetaPersistida> {
    const result = await prisma.execucaoColeta.update({ where: { id }, data: dados });
    return result as ExecucaoColetaPersistida;
  }

  async listar(fonteId?: string, limite = LIMITE_PADRAO): Promise<ExecucaoColetaProps[]> {
    const results = await prisma.execucaoColeta.findMany({
      where: fonteId ? { fonteId } : undefined,
      orderBy: { iniciadoEm: "desc" },
      take: limite,
    });
    return results as ExecucaoColetaProps[];
  }

  async buscarPorId(id: string): Promise<ExecucaoColetaProps | null> {
    const result = await prisma.execucaoColeta.findUnique({ where: { id } });
    return result as ExecucaoColetaProps | null;
  }
}
