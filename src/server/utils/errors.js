export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function assertData(result, fallback = 'Database request failed') {
  if (result.error) throw new AppError(400, result.error.message || fallback);
  return result.data;
}
