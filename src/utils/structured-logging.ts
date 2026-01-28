/**
 * Structured logging utilities
 * Following 2026 best practices for observability and debugging
 */

import { log as neutralinoLog, warn, logerror } from "./neu";

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  timestamp: string;
  level: LogLevel;
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    type?: string;
  };
  metadata?: Record<string, unknown>;
}

/**
 * Create a structured log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  error?: unknown,
  metadata?: Record<string, unknown>
): LogContext {
  const entry: LogContext = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (error) {
    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        type:
          "type" in error
            ? String((error as Record<string, unknown>).type)
            : undefined,
      };
    } else {
      entry.error = {
        name: "Unknown",
        message: String(error),
      };
    }
  }

  if (metadata && Object.keys(metadata).length > 0) {
    entry.metadata = metadata;
  }

  return entry;
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogContext): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.toUpperCase()}]`,
    entry.message,
  ];

  if (entry.error) {
    parts.push(`Error: ${entry.error.name}: ${entry.error.message}`);
  }

  if (entry.metadata) {
    parts.push(`Metadata: ${JSON.stringify(entry.metadata)}`);
  }

  return parts.join(" ");
}

/**
 * Log info message with optional metadata
 */
export async function logInfo(
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const entry = createLogEntry("info", message, undefined, metadata);
  await neutralinoLog(formatLogEntry(entry));
}

/**
 * Log warning message with optional metadata
 */
export async function logWarn(
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const entry = createLogEntry("warn", message, undefined, metadata);
  await warn(formatLogEntry(entry));
}

/**
 * Log error with structured context
 */
export async function logError(
  message: string,
  error: unknown,
  metadata?: Record<string, unknown>
): Promise<void> {
  const entry = createLogEntry("error", message, error, metadata);
  await logerror(formatLogEntry(entry));
}

/**
 * Log retry attempt
 */
export async function logRetry(
  operation: string,
  attempt: number,
  maxAttempts: number,
  error?: unknown,
  nextDelayMs?: number
): Promise<void> {
  const metadata: Record<string, unknown> = {
    operation,
    attempt,
    maxAttempts,
  };

  if (nextDelayMs !== undefined) {
    metadata.nextRetryIn = `${nextDelayMs}ms`;
  }

  const message = `Retry ${operation} (${attempt}/${maxAttempts})${
    nextDelayMs ? ` - waiting ${nextDelayMs}ms` : ""
  }`;

  await logWarn(message, metadata);

  if (error) {
    await logError(`Previous attempt failed`, error, metadata);
  }
}
