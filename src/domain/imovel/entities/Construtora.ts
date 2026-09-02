export interface ConstrutoraProps {
  nome: string;
  nomeEmpreendimento?: string | null;
}

export class Construtora {
  readonly nome: string;
  readonly nomeEmpreendimento: string | null;

  constructor(props: ConstrutoraProps) {
    this.nome = props.nome;
    this.nomeEmpreendimento = props.nomeEmpreendimento ?? null;
  }
}
