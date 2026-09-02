export const StatusConstrucao = {
  NA_PLANTA: "NA_PLANTA",
  EM_CONSTRUCAO: "EM_CONSTRUCAO",
  PRONTO: "PRONTO",
} as const;

export type StatusConstrucao =
  (typeof StatusConstrucao)[keyof typeof StatusConstrucao];
