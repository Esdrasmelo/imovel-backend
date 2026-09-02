import type { TipoImovel } from "../../imovel/enums/TipoImovel.ts";
import type { TipoNegocio } from "../../imovel/enums/TipoNegocio.ts";
import type { StatusConstrucao } from "../../imovel/enums/StatusConstrucao.ts";

export interface FiltroBusca {
  precoMin?: number;
  precoMax?: number;
  tipoImovel?: TipoImovel[];
  tipoNegocio?: TipoNegocio;
  statusConstrucao?: StatusConstrucao[];
  bairro?: string[];
  construtora?: string[];
  quartosMin?: number;
  areaMin?: number;
  aceitaFinanciamento?: boolean;
  fonte?: string[];
  cidade?: string;
  estado?: string;
  q?: string;
  ordenarPor?: "preco" | "areaUtil" | "quartos" | "criadoEm";
  ordem?: "asc" | "desc";
  pagina?: number;
  tamanhoPagina?: number;
}

export const FILTRO_BUSCA_DEFAULTS = {
  tipoNegocio: "VENDA" as TipoNegocio,
  ordenarPor: "criadoEm" as const,
  ordem: "desc" as const,
  pagina: 1,
  tamanhoPagina: 20,
} satisfies Partial<FiltroBusca>;
