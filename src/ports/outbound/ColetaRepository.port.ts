import type { ExecucaoColetaProps } from "../../domain/coleta/entities/ExecucaoColeta.ts";

export type ExecucaoColetaPersistida = ExecucaoColetaProps & { id: string };

export type AtualizacaoDeExecucao = Partial<
  Pick<
    ExecucaoColetaProps,
    | "status"
    | "finalizadoEm"
    | "totalEncontrados"
    | "totalNovos"
    | "totalAtualizados"
    | "totalErros"
    | "mensagemErro"
  >
>;

export interface ColetaRepositoryPort {
  criar(fonteId: string): Promise<ExecucaoColetaPersistida>;
  atualizar(id: string, dados: AtualizacaoDeExecucao): Promise<ExecucaoColetaPersistida>;
  listar(fonteId?: string, limite?: number): Promise<ExecucaoColetaProps[]>;
  buscarPorId(id: string): Promise<ExecucaoColetaProps | null>;
}
