import pino from "pino";
import { env } from "../config/env.ts";

const NIVEL_POR_AMBIENTE = {
  development: "debug",
  production: "info",
  test: "silent",
} as const;

export const logger = pino({
  level: NIVEL_POR_AMBIENTE[env.NODE_ENV],
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
