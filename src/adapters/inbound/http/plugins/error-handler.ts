import type { FastifyError, FastifyInstance } from "fastify";
import { AppError } from "../../../../shared/errors/AppError.ts";
import { logger } from "../../../../shared/utils/logger.ts";

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler<FastifyError>((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.code ?? "APP_ERROR",
        message: error.message,
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: "VALIDATION_ERROR",
        message: error.message,
      });
    }

    logger.error({ err: error }, "Erro nao tratado");

    return reply.status(500).send({
      statusCode: 500,
      error: "INTERNAL_SERVER_ERROR",
      message: "Erro interno do servidor",
    });
  });
}
