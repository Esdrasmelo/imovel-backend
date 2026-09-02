import { sleepReal, type Sleep } from "./retry.ts";

export interface Relogio {
  agora: () => number;
  dormir: Sleep;
}

export const relogioReal: Relogio = {
  agora: () => Date.now(),
  dormir: sleepReal,
};

export class RateLimiter {
  private ultimaRequisicao = 0;

  constructor(
    private readonly intervaloMs: number,
    private readonly relogio: Relogio = relogioReal,
  ) {}

  async wait(): Promise<void> {
    const decorrido = this.relogio.agora() - this.ultimaRequisicao;
    const restante = this.intervaloMs - decorrido;

    if (restante > 0) {
      await this.relogio.dormir(restante);
    }

    this.ultimaRequisicao = this.relogio.agora();
  }
}
