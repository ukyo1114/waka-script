export class NotImplementedError extends Error {
  readonly code = "not_implemented" as const;

  constructor(readonly operation: string) {
    super(`${operation} is not implemented yet`);
    this.name = "NotImplementedError";
  }
}
