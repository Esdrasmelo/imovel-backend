import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  CIDADE: z.string().default("Sorocaba"),
  ESTADO: z.string().default("SP"),
  PRECO_MAXIMO_COLETA: z.preprocess(
    (valor) => (valor === "" || valor == null ? undefined : valor),
    z.coerce.number().positive().optional(),
  ),
});

export const env = envSchema.parse(process.env);
