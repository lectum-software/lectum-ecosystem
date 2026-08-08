export class UploadValidationError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = "UploadValidationError";
    this.field = field;
  }
}

export class UploadInfrastructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadInfrastructureError";
  }
}
