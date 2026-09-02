import { injectable } from "tsyringe";
import { prisma } from "../../../shared/config/database.ts";
import type {
  ContagemPorFonte,
  ContagemPorStatus,
  ContagemPorTipo,
  ImovelRepositoryPort,
  UpsertResult,
} from "../../../ports/outbound/ImovelRepository.port.ts";
import type { ImovelData } from "../../../ports/outbound/ScraperPort.ts";
import type { ImovelProps } from "../../../domain/imovel/entities/Imovel.ts";
import type { TipoImovel } from "../../../domain/imovel/enums/TipoImovel.ts";
import type { TipoNegocio } from "../../../domain/imovel/enums/TipoNegocio.ts";
import type { StatusConstrucao } from "../../../domain/imovel/enums/StatusConstrucao.ts";
import type { FiltroBusca } from "../../../domain/busca/value-objects/FiltroBusca.ts";
import type { ResultadoPaginado } from "../../../domain/busca/value-objects/ResultadoPaginado.ts";
import { FILTRO_BUSCA_DEFAULTS } from "../../../domain/busca/value-objects/FiltroBusca.ts";
import { logger } from "../../../shared/utils/logger.ts";

const STATUS_DESCONHECIDO = "DESCONHECIDO";

@injectable()
export class PrismaImovelRepository implements ImovelRepositoryPort {
  async upsert(imovel: ImovelData, fonteId: string): Promise<ImovelProps> {
    const dados = this.paraPersistencia(imovel);

    const result = await prisma.imovel.upsert({
      where: { fonteId_externalId: { fonteId, externalId: imovel.externalId } },
      update: { ...dados, ativo: true },
      create: { ...dados, externalId: imovel.externalId, fonteId },
    });

    return this.toDomain(result);
  }

  async upsertMany(imoveis: ImovelData[], fonteId: string): Promise<UpsertResult> {
    let novos = 0;
    let atualizados = 0;
    let erros = 0;

    for (const imovel of imoveis) {
      try {
        const jaExistia = await this.existe(fonteId, imovel.externalId);
        await this.upsert(imovel, fonteId);
        if (jaExistia) atualizados++;
        else novos++;
      } catch (error) {
        erros++;
        logger.error({ error, externalId: imovel.externalId }, "Erro ao upsert imovel");
      }
    }

    return { novos, atualizados, erros };
  }

  async findById(id: string): Promise<ImovelProps | null> {
    const result = await prisma.imovel.findUnique({ where: { id } });
    return result ? this.toDomain(result) : null;
  }

  async search(filtros: FiltroBusca): Promise<ResultadoPaginado<ImovelProps>> {
    const pagina = filtros.pagina ?? FILTRO_BUSCA_DEFAULTS.pagina;
    const tamanhoPagina = filtros.tamanhoPagina ?? FILTRO_BUSCA_DEFAULTS.tamanhoPagina;
    const skip = (pagina - 1) * tamanhoPagina;

    const where = this.buildWhere(filtros);
    const orderBy = this.buildOrderBy(
      filtros.ordenarPor ?? FILTRO_BUSCA_DEFAULTS.ordenarPor,
      filtros.ordem ?? FILTRO_BUSCA_DEFAULTS.ordem,
    );

    const [data, total] = await Promise.all([
      prisma.imovel.findMany({ where, orderBy, skip, take: tamanhoPagina }),
      prisma.imovel.count({ where }),
    ]);

    return {
      data: data.map((item) => this.toDomain(item)),
      meta: { total, pagina, tamanhoPagina, totalPaginas: Math.ceil(total / tamanhoPagina) },
    };
  }

  async listarBairros(cidade?: string): Promise<string[]> {
    const results = await prisma.imovel.findMany({
      where: { ...(cidade ? { cidade } : {}), ativo: true, bairro: { not: null } },
      select: { bairro: true },
      distinct: ["bairro"],
      orderBy: { bairro: "asc" },
    });

    return results.map((r) => r.bairro).filter((b): b is string => b != null);
  }

  async listarConstrutoras(): Promise<string[]> {
    const results = await prisma.imovel.findMany({
      where: { ativo: true, construtora: { not: null } },
      select: { construtora: true },
      distinct: ["construtora"],
      orderBy: { construtora: "asc" },
    });

    return results.map((r) => r.construtora).filter((c): c is string => c != null);
  }

  async listarFontes(): Promise<string[]> {
    const results = await prisma.fonteDados.findMany({
      where: { imoveis: { some: { ativo: true } } },
      select: { nome: true },
      orderBy: { nome: "asc" },
    });

    return results.map((r) => r.nome);
  }

  async countByFonte(fonteId: string): Promise<number> {
    return prisma.imovel.count({ where: { fonteId, ativo: true } });
  }

  async contarAtivos(): Promise<number> {
    return prisma.imovel.count({ where: { ativo: true } });
  }

  async precosDosAtivos(): Promise<number[]> {
    const linhas = await prisma.imovel.findMany({
      where: { ativo: true, preco: { not: null } },
      select: { preco: true },
    });
    return linhas.map((l) => l.preco).filter((p): p is number => p != null);
  }

  async contarAtivosPorFonte(): Promise<ContagemPorFonte[]> {
    const [grupos, fontes] = await Promise.all([
      prisma.imovel.groupBy({ by: ["fonteId"], where: { ativo: true }, _count: true }),
      prisma.fonteDados.findMany({ select: { id: true, nome: true } }),
    ]);
    const nomePorId = new Map(fontes.map((f) => [f.id, f.nome]));

    return grupos.map((g) => ({
      fonte: nomePorId.get(g.fonteId) ?? g.fonteId,
      quantidade: g._count,
    }));
  }

  async contarAtivosPorTipo(): Promise<ContagemPorTipo[]> {
    const grupos = await prisma.imovel.groupBy({
      by: ["tipoImovel"],
      where: { ativo: true },
      _count: true,
    });
    return grupos.map((g) => ({ tipo: g.tipoImovel, quantidade: g._count }));
  }

  async contarAtivosPorStatus(): Promise<ContagemPorStatus[]> {
    const grupos = await prisma.imovel.groupBy({
      by: ["statusConstrucao"],
      where: { ativo: true },
      _count: true,
    });
    return grupos.map((g) => ({
      status: g.statusConstrucao ?? STATUS_DESCONHECIDO,
      quantidade: g._count,
    }));
  }

  private async existe(fonteId: string, externalId: string): Promise<boolean> {
    const encontrado = await prisma.imovel.findUnique({
      where: { fonteId_externalId: { fonteId, externalId } },
      select: { id: true },
    });
    return encontrado !== null;
  }

  private paraPersistencia(imovel: ImovelData) {
    return {
      titulo: imovel.titulo,
      descricao: imovel.descricao,
      url: imovel.url,
      urlImagens: imovel.urlImagens ? JSON.stringify(imovel.urlImagens) : null,
      preco: imovel.preco,
      precoPorM2: precoPorMetroQuadrado(imovel.preco, imovel.areaUtil),
      valorCondominio: imovel.valorCondominio,
      tipoImovel: imovel.tipoImovel,
      tipoNegocio: imovel.tipoNegocio,
      statusConstrucao: imovel.statusConstrucao,
      areaUtil: imovel.areaUtil,
      areaTotal: imovel.areaTotal,
      quartos: imovel.quartos,
      suites: imovel.suites,
      banheiros: imovel.banheiros,
      vagas: imovel.vagas,
      cep: imovel.cep,
      logradouro: imovel.logradouro,
      numero: imovel.numero,
      complemento: imovel.complemento,
      bairro: imovel.bairro,
      cidade: imovel.cidade,
      estado: imovel.estado,
      latitude: imovel.latitude,
      longitude: imovel.longitude,
      nomeEmpreendimento: imovel.nomeEmpreendimento,
      construtora: imovel.construtora,
      aceitaFinanciamento: imovel.aceitaFinanciamento,
      codigoImovel: imovel.codigoImovel,
      dataPublicacao: imovel.dataPublicacao,
    };
  }

  private buildWhere(filtros: FiltroBusca) {
    const where: Record<string, unknown> = { ativo: true };

    if (filtros.cidade) where.cidade = filtros.cidade;
    if (filtros.estado) where.estado = filtros.estado;

    if (filtros.precoMin != null || filtros.precoMax != null) {
      const preco: Record<string, number> = {};
      if (filtros.precoMin != null) preco.gte = filtros.precoMin;
      if (filtros.precoMax != null) preco.lte = filtros.precoMax;
      where.preco = preco;
    }

    if (filtros.tipoImovel?.length) where.tipoImovel = { in: filtros.tipoImovel };
    if (filtros.tipoNegocio) where.tipoNegocio = filtros.tipoNegocio;
    if (filtros.statusConstrucao?.length) where.statusConstrucao = { in: filtros.statusConstrucao };
    if (filtros.bairro?.length) where.bairro = { in: filtros.bairro };
    if (filtros.construtora?.length) where.construtora = { in: filtros.construtora };
    if (filtros.quartosMin != null) where.quartos = { gte: filtros.quartosMin };
    if (filtros.areaMin != null) where.areaUtil = { gte: filtros.areaMin };
    if (filtros.aceitaFinanciamento != null) where.aceitaFinanciamento = filtros.aceitaFinanciamento;
    if (filtros.fonte?.length) where.fonte = { nome: { in: filtros.fonte } };

    if (filtros.q) {
      where.OR = [
        { titulo: { contains: filtros.q } },
        { descricao: { contains: filtros.q } },
        { bairro: { contains: filtros.q } },
        { nomeEmpreendimento: { contains: filtros.q } },
      ];
    }

    return where;
  }

  private buildOrderBy(ordenarPor: string, ordem: "asc" | "desc"): Record<string, string> {
    return { [ordenarPor]: ordem };
  }

  private toDomain(record: {
    id: string;
    externalId: string;
    fonteId: string;
    titulo: string;
    descricao: string | null;
    url: string;
    urlImagens: string | null;
    preco: number | null;
    precoPorM2: number | null;
    valorCondominio: number | null;
    tipoImovel: string;
    tipoNegocio: string;
    statusConstrucao: string | null;
    areaUtil: number | null;
    areaTotal: number | null;
    quartos: number | null;
    suites: number | null;
    banheiros: number | null;
    vagas: number | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string;
    estado: string;
    latitude: number | null;
    longitude: number | null;
    nomeEmpreendimento: string | null;
    construtora: string | null;
    aceitaFinanciamento: boolean | null;
    codigoImovel: string | null;
    dataPublicacao: Date | null;
    dataAtualizacao: Date | null;
    criadoEm: Date;
    atualizadoEm: Date;
    ativo: boolean;
  }): ImovelProps {
    return {
      ...record,
      tipoImovel: record.tipoImovel as TipoImovel,
      tipoNegocio: record.tipoNegocio as TipoNegocio,
      statusConstrucao: record.statusConstrucao as StatusConstrucao | null,
      urlImagens: record.urlImagens ? (JSON.parse(record.urlImagens) as string[]) : [],
    };
  }
}

export function precoPorMetroQuadrado(
  preco: number | null | undefined,
  areaUtil: number | null | undefined,
): number | null {
  if (preco == null || areaUtil == null || areaUtil <= 0) return null;
  return preco / areaUtil;
}
