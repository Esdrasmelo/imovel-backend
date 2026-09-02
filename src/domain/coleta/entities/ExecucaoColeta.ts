export const StatusExecucao = {
  PENDENTE: "PENDENTE",
  EM_ANDAMENTO: "EM_ANDAMENTO",
  SUCESSO: "SUCESSO",
  ERRO: "ERRO",
  PARCIAL: "PARCIAL",
} as const;

export type StatusExecucao =
  (typeof StatusExecucao)[keyof typeof StatusExecucao];

export interface ExecucaoColetaProps {
  id?: string;
  fonteId: string;
  status: StatusExecucao;
  iniciadoEm?: Date;
  finalizadoEm?: Date | null;
  totalEncontrados?: number;
  totalNovos?: number;
  totalAtualizados?: number;
  totalErros?: number;
  mensagemErro?: string | null;
}

export class ExecucaoColeta {
  readonly id: string | undefined;
  readonly fonteId: string;
  readonly status: StatusExecucao;
  readonly iniciadoEm: Date;
  readonly finalizadoEm: Date | null;
  readonly totalEncontrados: number;
  readonly totalNovos: number;
  readonly totalAtualizados: number;
  readonly totalErros: number;
  readonly mensagemErro: string | null;

  constructor(props: ExecucaoColetaProps) {
    this.id = props.id;
    this.fonteId = props.fonteId;
    this.status = props.status;
    this.iniciadoEm = props.iniciadoEm ?? new Date();
    this.finalizadoEm = props.finalizadoEm ?? null;
    this.totalEncontrados = props.totalEncontrados ?? 0;
    this.totalNovos = props.totalNovos ?? 0;
    this.totalAtualizados = props.totalAtualizados ?? 0;
    this.totalErros = props.totalErros ?? 0;
    this.mensagemErro = props.mensagemErro ?? null;
  }
}
