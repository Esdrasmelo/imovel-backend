import type { ImovelProps } from "../../domain/imovel/entities/Imovel.ts";
import type { FiltroBusca } from "../../domain/busca/value-objects/FiltroBusca.ts";
import type { ResultadoPaginado } from "../../domain/busca/value-objects/ResultadoPaginado.ts";

export interface EstatisticasBusca {
  totalImoveis: number;
  precoMedio: number | null;
  precoMediano: number | null;
  distribuicaoPreco: Array<{ faixa: string; quantidade: number }>;
  porFonte: Array<{ fonte: string; quantidade: number }>;
  porTipo: Array<{ tipo: string; quantidade: number }>;
  porStatus: Array<{ status: string; quantidade: number }>;
}

export interface BuscaServicePort {
  buscar(filtros: FiltroBusca): Promise<ResultadoPaginado<ImovelProps>>;
  buscarPorId(id: string): Promise<ImovelProps | null>;
  listarBairros(cidade?: string): Promise<string[]>;
  listarConstrutoras(): Promise<string[]>;
  listarFontes(): Promise<string[]>;
  obterEstatisticas(): Promise<EstatisticasBusca>;
}
