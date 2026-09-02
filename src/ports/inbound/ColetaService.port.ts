import type { ExecucaoColetaProps } from "../../domain/coleta/entities/ExecucaoColeta.ts";
import type { FonteDadosProps } from "../../domain/coleta/entities/FonteDados.ts";

export interface StatusFonte {
  fonte: FonteDadosProps;
  ultimaExecucao: ExecucaoColetaProps | null;
  totalImoveis: number;
}

export interface ColetaServicePort {
  executarColeta(fonteNome?: string): Promise<ExecucaoColetaProps[]>;
  listarExecucoes(fonteId?: string, limite?: number): Promise<ExecucaoColetaProps[]>;
  obterStatusFontes(): Promise<StatusFonte[]>;
}
