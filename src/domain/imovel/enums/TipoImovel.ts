export const TipoImovel = {
  APARTAMENTO: "APARTAMENTO",
  CASA: "CASA",
  TERRENO: "TERRENO",
  LOTE: "LOTE",
  STUDIO: "STUDIO",
  COMERCIAL: "COMERCIAL",
} as const;

export type TipoImovel = (typeof TipoImovel)[keyof typeof TipoImovel];
