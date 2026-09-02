export class ScrapingError extends Error {
  constructor(
    public readonly fonte: string,
    message: string,
    public readonly pagina?: number,
    public override readonly cause?: unknown,
  ) {
    super(`[${fonte}] ${message}`);
    this.name = "ScrapingError";
  }
}
