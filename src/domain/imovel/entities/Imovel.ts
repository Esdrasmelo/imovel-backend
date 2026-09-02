import type { TipoImovel } from "../enums/TipoImovel.ts";
import type { TipoNegocio } from "../enums/TipoNegocio.ts";
import type { StatusConstrucao } from "../enums/StatusConstrucao.ts";

export interface ImovelProps {
  id?: string;
  externalId: string;
  fonteId: string;

  titulo: string;
  descricao?: string | null;
  url: string;
  urlImagens?: string[];

  preco?: number | null;
  precoPorM2?: number | null;
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
  dataAtualizacao?: Date | null;

  criadoEm?: Date;
  atualizadoEm?: Date;
  ativo?: boolean;
}

export class Imovel {
  readonly id: string | undefined;
  readonly externalId: string;
  readonly fonteId: string;
  readonly titulo: string;
  readonly descricao: string | null;
  readonly url: string;
  readonly urlImagens: string[];
  readonly preco: number | null;
  readonly precoPorM2: number | null;
  readonly valorCondominio: number | null;
  readonly tipoImovel: TipoImovel;
  readonly tipoNegocio: TipoNegocio;
  readonly statusConstrucao: StatusConstrucao | null;
  readonly areaUtil: number | null;
  readonly areaTotal: number | null;
  readonly quartos: number | null;
  readonly suites: number | null;
  readonly banheiros: number | null;
  readonly vagas: number | null;
  readonly cep: string | null;
  readonly logradouro: string | null;
  readonly numero: string | null;
  readonly complemento: string | null;
  readonly bairro: string | null;
  readonly cidade: string;
  readonly estado: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly nomeEmpreendimento: string | null;
  readonly construtora: string | null;
  readonly aceitaFinanciamento: boolean | null;
  readonly codigoImovel: string | null;
  readonly dataPublicacao: Date | null;
  readonly dataAtualizacao: Date | null;
  readonly criadoEm: Date | undefined;
  readonly atualizadoEm: Date | undefined;
  readonly ativo: boolean;

  constructor(props: ImovelProps) {
    this.id = props.id;
    this.externalId = props.externalId;
    this.fonteId = props.fonteId;
    this.titulo = props.titulo;
    this.descricao = props.descricao ?? null;
    this.url = props.url;
    this.urlImagens = props.urlImagens ?? [];
    this.preco = props.preco ?? null;
    this.precoPorM2 = props.precoPorM2 ?? null;
    this.valorCondominio = props.valorCondominio ?? null;
    this.tipoImovel = props.tipoImovel;
    this.tipoNegocio = props.tipoNegocio;
    this.statusConstrucao = props.statusConstrucao ?? null;
    this.areaUtil = props.areaUtil ?? null;
    this.areaTotal = props.areaTotal ?? null;
    this.quartos = props.quartos ?? null;
    this.suites = props.suites ?? null;
    this.banheiros = props.banheiros ?? null;
    this.vagas = props.vagas ?? null;
    this.cep = props.cep ?? null;
    this.logradouro = props.logradouro ?? null;
    this.numero = props.numero ?? null;
    this.complemento = props.complemento ?? null;
    this.bairro = props.bairro ?? null;
    this.cidade = props.cidade;
    this.estado = props.estado;
    this.latitude = props.latitude ?? null;
    this.longitude = props.longitude ?? null;
    this.nomeEmpreendimento = props.nomeEmpreendimento ?? null;
    this.construtora = props.construtora ?? null;
    this.aceitaFinanciamento = props.aceitaFinanciamento ?? null;
    this.codigoImovel = props.codigoImovel ?? null;
    this.dataPublicacao = props.dataPublicacao ?? null;
    this.dataAtualizacao = props.dataAtualizacao ?? null;
    this.criadoEm = props.criadoEm;
    this.atualizadoEm = props.atualizadoEm;
    this.ativo = props.ativo ?? true;
  }
}
