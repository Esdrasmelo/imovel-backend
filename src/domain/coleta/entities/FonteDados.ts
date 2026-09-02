export interface FonteDadosProps {
  id: string;
  nome: string;
  tipo: string;
  urlBase: string;
  ativo: boolean;
  criadoEm: Date;
}

export class FonteDados {
  readonly id: string;
  readonly nome: string;
  readonly tipo: string;
  readonly urlBase: string;
  readonly ativo: boolean;
  readonly criadoEm: Date;

  constructor(props: FonteDadosProps) {
    this.id = props.id;
    this.nome = props.nome;
    this.tipo = props.tipo;
    this.urlBase = props.urlBase;
    this.ativo = props.ativo;
    this.criadoEm = props.criadoEm;
  }
}
