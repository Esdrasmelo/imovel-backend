export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} com id '${id}' nao encontrado` : `${resource} nao encontrado`,
      404,
      "NOT_FOUND",
    );
    this.name = "NotFoundError";
  }
}
