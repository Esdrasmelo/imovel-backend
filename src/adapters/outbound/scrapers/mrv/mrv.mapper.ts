import type { ImovelData } from "../../../../ports/outbound/ScraperPort.ts";
import type { TipoImovel } from "../../../../domain/imovel/enums/TipoImovel.ts";
import type { StatusConstrucao } from "../../../../domain/imovel/enums/StatusConstrucao.ts";

export interface MrvRawEmpreendimento {
  nome: string;
  url: string;
  tipo: string;
  status: string;
  endereco: string | null;
  bairro: string | null;
  cidade: string;
  estado: string;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  areaMin: number | null;
  areaMax: number | null;
  quartos: number | null;
  quartosMax: number | null;
  imagemUrl: string | null;
  imagens: string[];
  totalUnidades: number | null;
  totalGaragem: number | null;
}

const TIPO_MAP: Record<string, TipoImovel> = {
  apartamento: "APARTAMENTO",
  casa: "CASA",
  terreno: "TERRENO",
  lote: "LOTE",
};

const TIPO_IMOVEL_PADRAO: TipoImovel = "APARTAMENTO";
const STATUS_PADRAO_DA_CONSTRUTORA: StatusConstrucao = "EM_CONSTRUCAO";
const NOME_DA_CONSTRUTORA = "MRV";
const PRECO_SOB_CONSULTA = null;
const CONSTRUTORA_OPERA_COM_FINANCIAMENTO = true;

export function mapTipoImovel(texto: string): TipoImovel {
  const normalizado = texto.trim().toLowerCase();
  for (const [chave, tipo] of Object.entries(TIPO_MAP)) {
    if (normalizado.includes(chave)) return tipo;
  }
  return TIPO_IMOVEL_PADRAO;
}

export function mapStatus(status: string): StatusConstrucao {
  const texto = status.trim().toLowerCase();

  if (texto.includes("planta") || texto.includes("lançamento") || texto.includes("lancamento")) return "NA_PLANTA";
  if (texto.includes("construção") || texto.includes("construcao") || texto.includes("obra")) return "EM_CONSTRUCAO";
  if (texto.includes("pronto") || texto.includes("entregue")) return "PRONTO";

  return STATUS_PADRAO_DA_CONSTRUTORA;
}

export function vagasPorUnidade(totalGaragem: number | null, totalUnidades: number | null): number | null {
  if (!totalGaragem) return null;
  return Math.max(1, Math.floor(totalGaragem / (totalUnidades || 1)));
}

export function slugDaUrl(url: string, alternativa: string): string {
  return url.replace(/\/$/, "").split("/").pop() || alternativa.toLowerCase().replace(/\s+/g, "-");
}

export function mapToImovelData(raw: MrvRawEmpreendimento): ImovelData {
  const slug = slugDaUrl(raw.url, raw.nome);

  return {
    externalId: `mrv-${slug}`,
    titulo: `${raw.nome} - ${NOME_DA_CONSTRUTORA}`,
    descricao: montarDescricao(raw),
    url: raw.url,
    urlImagens: raw.imagens.length > 0 ? raw.imagens : raw.imagemUrl ? [raw.imagemUrl] : [],
    preco: PRECO_SOB_CONSULTA,
    valorCondominio: null,
    tipoImovel: mapTipoImovel(raw.tipo),
    tipoNegocio: "VENDA",
    statusConstrucao: mapStatus(raw.status),
    areaUtil: raw.areaMin,
    areaTotal: null,
    quartos: raw.quartos,
    suites: null,
    banheiros: null,
    vagas: vagasPorUnidade(raw.totalGaragem, raw.totalUnidades),
    cep: raw.cep,
    logradouro: raw.endereco,
    numero: null,
    complemento: null,
    bairro: raw.bairro ? raw.bairro.replace(/-/g, " ") : null,
    cidade: raw.cidade,
    estado: raw.estado,
    latitude: raw.latitude,
    longitude: raw.longitude,
    nomeEmpreendimento: raw.nome,
    construtora: NOME_DA_CONSTRUTORA,
    aceitaFinanciamento: CONSTRUTORA_OPERA_COM_FINANCIAMENTO,
    codigoImovel: slug,
    dataPublicacao: null,
  };
}

function montarDescricao(raw: MrvRawEmpreendimento): string {
  const partes: string[] = [`Empreendimento ${raw.nome} da ${NOME_DA_CONSTRUTORA}`];

  if (raw.status) partes.push(`Status: ${raw.status}`);

  if (raw.areaMin && raw.areaMax && raw.areaMin !== raw.areaMax) {
    partes.push(`Área: ${raw.areaMin} a ${raw.areaMax} m²`);
  } else if (raw.areaMin) {
    partes.push(`Área: ${raw.areaMin} m²`);
  }

  if (raw.quartos && raw.quartosMax && raw.quartos !== raw.quartosMax) {
    partes.push(`${raw.quartos} a ${raw.quartosMax} quartos`);
  } else if (raw.quartos) {
    partes.push(`${raw.quartos} quartos`);
  }

  if (raw.totalUnidades) partes.push(`${raw.totalUnidades} unidades`);

  return partes.join(". ");
}
