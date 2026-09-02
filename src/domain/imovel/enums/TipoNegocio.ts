export const TipoNegocio = {
  VENDA: "VENDA",
  ALUGUEL: "ALUGUEL",
} as const;

export type TipoNegocio = (typeof TipoNegocio)[keyof typeof TipoNegocio];
