export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function assert(condition: unknown, statusCode: number, message: string): asserts condition {
  if (!condition) {
    throw new AppError(statusCode, message);
  }
}
