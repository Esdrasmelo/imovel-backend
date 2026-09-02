export class Preco {
  private constructor(
    public readonly valor: number,
    public readonly moeda: string = "BRL",
  ) {}

  static criar(valor: number | null | undefined): Preco | null {
    if (valor == null || valor < 0) return null;
    return new Preco(valor);
  }

  get formatado(): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: this.moeda,
    }).format(this.valor);
  }

  calcularPorM2(areaUtil: number): Preco | null {
    if (areaUtil <= 0) return null;
    return new Preco(this.valor / areaUtil);
  }
}
