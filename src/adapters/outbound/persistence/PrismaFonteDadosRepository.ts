import { injectable } from "tsyringe";
import { prisma } from "../../../shared/config/database.ts";
import type { FonteDadosRepositoryPort } from "../../../ports/outbound/FonteDadosRepository.port.ts";
import type { FonteDadosProps } from "../../../domain/coleta/entities/FonteDados.ts";

@injectable()
export class PrismaFonteDadosRepository implements FonteDadosRepositoryPort {
  async buscarPorNome(nome: string): Promise<FonteDadosProps | null> {
    return prisma.fonteDados.findUnique({ where: { nome } });
  }

  async listarAtivas(): Promise<FonteDadosProps[]> {
    return prisma.fonteDados.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
    });
  }

  async listarTodas(): Promise<FonteDadosProps[]> {
    return prisma.fonteDados.findMany({ orderBy: { nome: "asc" } });
  }
}
