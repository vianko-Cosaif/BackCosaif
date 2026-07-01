export class DomainError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "DomainError";
    this.status = status;
    this.details = details;
  }
}
