/**
 * Custom error classes for type-safe error handling
 * Following 2026 best practices for structured error management
 */

export class TimeoutError extends Error {
  readonly type = "timeout-error" as const;

  constructor(
    message: string,
    public readonly timeoutMs: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "TimeoutError";
  }
}

export class NetworkError extends Error {
  readonly type = "network-error" as const;
  public readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    options?: ErrorOptions & { metadata?: Record<string, unknown> }
  ) {
    super(message, { cause: options?.cause });
    this.name = "NetworkError";
    this.metadata = options?.metadata;
  }
}

export class ProcessSpawnError extends Error {
  readonly type = "process-spawn-error" as const;

  constructor(
    message: string,
    public readonly processName: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ProcessSpawnError";
  }
}

export class ConnectionError extends Error {
  readonly type = "connection-error" as const;

  constructor(
    message: string,
    public readonly host: string,
    public readonly port?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ConnectionError";
  }
}

export class FileSystemError extends Error {
  readonly type = "filesystem-error" as const;

  constructor(
    message: string,
    public readonly path: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "FileSystemError";
  }
}

/**
 * Type guard to check if error is a specific custom error
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isConnectionError(error: unknown): error is ConnectionError {
  return error instanceof ConnectionError;
}
