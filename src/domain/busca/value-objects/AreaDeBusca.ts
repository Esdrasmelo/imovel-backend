export class AreaDeBusca {
  private constructor(
    public readonly cidade: string,
    public readonly estado: string,
  ) {}

  static criar(cidade: string, estado: string): AreaDeBusca {
    const cidadeLimpa = cidade.trim();
    const uf = estado.trim().toUpperCase();

    if (!cidadeLimpa) {
      throw new Error("A cidade da área de busca não pode ser vazia");
    }
    if (!/^[A-Z]{2}$/.test(uf)) {
      throw new Error(`UF inválida para a área de busca: "${estado}"`);
    }

    return new AreaDeBusca(cidadeLimpa, uf);
  }
}
