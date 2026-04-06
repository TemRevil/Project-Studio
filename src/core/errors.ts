export class ProjectStudioError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  public constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ProjectStudioError";
    this.code = code;
    this.details = details;
  }
}

export class ValidationFailure extends ProjectStudioError {
  public constructor(message: string, details?: unknown) {
    super("VALIDATION_FAILURE", message, details);
    this.name = "ValidationFailure";
  }
}

export class PreflightFailure extends ProjectStudioError {
  public constructor(message: string, details?: unknown) {
    super("PREFLIGHT_FAILURE", message, details);
    this.name = "PreflightFailure";
  }
}

export class ProviderFailure extends ProjectStudioError {
  public constructor(message: string, details?: unknown) {
    super("PROVIDER_FAILURE", message, details);
    this.name = "ProviderFailure";
  }
}

export class UnsupportedCapabilityFailure extends ProjectStudioError {
  public constructor(message: string, details?: unknown) {
    super("UNSUPPORTED_CAPABILITY", message, details);
    this.name = "UnsupportedCapabilityFailure";
  }
}

export class RenderFailure extends ProjectStudioError {
  public constructor(message: string, details?: unknown) {
    super("RENDER_FAILURE", message, details);
    this.name = "RenderFailure";
  }
}
