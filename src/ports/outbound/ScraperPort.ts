import type { TipoImovel } from "../../domain/imovel/enums/TipoImovel.ts";
import type { TipoNegocio } from "../../domain/imovel/enums/TipoNegocio.ts";
import type { StatusConstrucao } from "../../domain/imovel/enums/StatusConstrucao.ts";

export interface ScraperParams {
  cidade: string;
  estado: string;
  precoMaximo?: number;
  tipoImovel?: TipoImovel[];
  tipoNegocio?: TipoNegocio;
  statusConstrucao?: StatusConstrucao[];
  pagina?: number;
  tamanhoPagina?: number;
}

export interface ImovelData {
  externalId: string;
  titulo: string;
  descricao?: string | null;
  url: string;
  urlImagens?: string[];
  preco?: number | null;
  valorCondominio?: number | null;
  tipoImovel: TipoImovel;
  tipoNegocio: TipoNegocio;
  statusConstrucao?: StatusConstrucao | null;
  areaUtil?: number | null;
  areaTotal?: number | null;
  quartos?: number | null;
  suites?: number | null;
  banheiros?: number | null;
  vagas?: number | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade: string;
  estado: string;
  latitude?: number | null;
  longitude?: number | null;
  nomeEmpreendimento?: string | null;
  construtora?: string | null;
  aceitaFinanciamento?: boolean | null;
  codigoImovel?: string | null;
  dataPublicacao?: Date | null;
}

export interface ScraperResult {
  imoveis: ImovelData[];
  totalEncontrados: number;
  erros: Array<{ pagina?: number; error: string }>;
}

export interface ScraperPort {
  readonly fonteNome: string;
  scrape(params: ScraperParams): Promise<ScraperResult>;
  healthCheck(): Promise<boolean>;
}
