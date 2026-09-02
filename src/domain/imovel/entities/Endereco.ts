export interface EnderecoProps {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade: string;
  estado: string;
}

export class Endereco {
  readonly cep: string | null;
  readonly logradouro: string | null;
  readonly numero: string | null;
  readonly complemento: string | null;
  readonly bairro: string | null;
  readonly cidade: string;
  readonly estado: string;

  constructor(props: EnderecoProps) {
    this.cep = props.cep ?? null;
    this.logradouro = props.logradouro ?? null;
    this.numero = props.numero ?? null;
    this.complemento = props.complemento ?? null;
    this.bairro = props.bairro ?? null;
    this.cidade = props.cidade;
    this.estado = props.estado;
  }

  get formatado(): string {
    const parts = [
      this.logradouro,
      this.numero,
      this.complemento,
      this.bairro,
      `${this.cidade}/${this.estado}`,
    ].filter(Boolean);
    return parts.join(", ");
  }
}
