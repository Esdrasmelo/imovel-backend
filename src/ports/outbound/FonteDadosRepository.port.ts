import type { FonteDadosProps } from "../../domain/coleta/entities/FonteDados.ts";

export interface FonteDadosRepositoryPort {
  buscarPorNome(nome: string): Promise<FonteDadosProps | null>;
  listarAtivas(): Promise<FonteDadosProps[]>;
  listarTodas(): Promise<FonteDadosProps[]>;
}
