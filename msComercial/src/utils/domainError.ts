export class CommercialDomainError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CommercialDomainError";
  }
}
