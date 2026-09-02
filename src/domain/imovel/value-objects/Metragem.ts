export class Metragem {
  private constructor(
    public readonly areaUtil: number | null,
    public readonly areaTotal: number | null,
  ) {}

  static criar(areaUtil?: number | null, areaTotal?: number | null): Metragem {
    return new Metragem(areaUtil ?? null, areaTotal ?? null);
  }

  get formatadoUtil(): string | null {
    if (this.areaUtil == null) return null;
    return `${this.areaUtil} m\u00B2`;
  }

  get formatadoTotal(): string | null {
    if (this.areaTotal == null) return null;
    return `${this.areaTotal} m\u00B2`;
  }
}
