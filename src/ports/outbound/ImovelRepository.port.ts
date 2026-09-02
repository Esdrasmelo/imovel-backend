import type { ImovelProps } from "../../domain/imovel/entities/Imovel.ts";
import type { ImovelData } from "./ScraperPort.ts";
import type { FiltroBusca } from "../../domain/busca/value-objects/FiltroBusca.ts";
import type { ResultadoPaginado } from "../../domain/busca/value-objects/ResultadoPaginado.ts";

export interface UpsertResult {
  novos: number;
  atualizados: number;
  erros: number;
}

export interface ContagemPorFonte {
  fonte: string;
  quantidade: number;
}

export interface ContagemPorTipo {
  tipo: string;
  quantidade: number;
}

export interface ContagemPorStatus {
  status: string;
  quantidade: number;
}

export interface ImovelRepositoryPort {
  upsert(imovel: ImovelData, fonteId: string): Promise<ImovelProps>;
  upsertMany(imoveis: ImovelData[], fonteId: string): Promise<UpsertResult>;
  findById(id: string): Promise<ImovelProps | null>;
  search(filtros: FiltroBusca): Promise<ResultadoPaginado<ImovelProps>>;
  listarBairros(cidade?: string): Promise<string[]>;
  listarConstrutoras(): Promise<string[]>;
  listarFontes(): Promise<string[]>;
  countByFonte(fonteId: string): Promise<number>;
  contarAtivos(): Promise<number>;
  precosDosAtivos(): Promise<number[]>;
  contarAtivosPorFonte(): Promise<ContagemPorFonte[]>;
  contarAtivosPorTipo(): Promise<ContagemPorTipo[]>;
  contarAtivosPorStatus(): Promise<ContagemPorStatus[]>;
}
