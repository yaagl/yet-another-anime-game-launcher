/**
 * HTTP Client for Neutralino.js (2026 Best Practices)
 * 
 * Bypasses WebView CORS restrictions by using Neutralino.os.execCommand with curl.
 * This approach works on all platforms and avoids browser security limitations.
 * 
 * @see https://context7.com/neutralinojs/neutralinojs - Neutralino.os.execCommand
 */

import { log } from "./neu";
import { NetworkError, TimeoutError } from "../errors";
import { logError, logInfo } from "./structured-logging";
import { getTimeout } from "../config/timeouts";
import { build, rawString } from "./command-builder";

/**
 * HTTP Response interface compatible with fetch() API
 */
export interface HttpResponse {
  /**
   * HTTP status code (200, 404, etc.)
   */
  status: number;

  /**
   * HTTP status text ("OK", "Not Found", etc.)
   */
  statusText: string;

  /**
   * Response URL
   */
  url: string;

  /**
   * Response headers as key-value pairs
   */
  headers: Record<string, string>;

  /**
   * Parse response body as JSON
   */
  json<T = unknown>(): Promise<T>;

  /**
   * Get response body as text
   */
  text(): Promise<string>;
}

/**
 * HTTP Client Options
 */
export interface HttpClientOptions {
  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * HTTP method (GET, POST, etc.)
   * @default "GET"
   */
  method?: string;

  /**
   * Request headers
   */
  headers?: Record<string, string>;

  /**
   * Follow redirects automatically
   * @default true
   */
  followRedirects?: boolean;

  /**
   * Maximum number of redirects to follow
   * @default 5
   */
  maxRedirects?: number;
}

/**
 * Makes an HTTP request using curl via Neutralino.os.execCommand
 * 
 * This function bypasses WebView CORS restrictions by executing curl
 * through the operating system, which has no CORS limitations.
 * 
 * Best Practices (2026):
 * - Uses native curl for maximum compatibility
 * - Proper timeout handling with configurable values
 * - Structured error reporting with context
 * - Compatible with exponential backoff retry logic
 * - Type-safe with TypeScript
 * 
 * @param url - URL to fetch
 * @param options - HTTP request options
 * @returns Promise resolving to HttpResponse
 * @throws {TimeoutError} When request exceeds timeout
 * @throws {NetworkError} When curl command fails
 * 
 * @example
 * ```typescript
 * try {
 *   const response = await httpFetch('https://api.github.com/octocat');
 *   const data = await response.json();
 *   console.log('Status:', response.status);
 *   console.log('Data:', data);
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     console.error('Network error:', error.message);
 *   }
 * }
 * ```
 */
export async function httpFetch(
  url: string,
  options: HttpClientOptions = {}
): Promise<HttpResponse> {
  const {
    timeout = getTimeout("GITHUB_ENDPOINT"),
    method = "GET",
    headers = {},
    followRedirects = true,
    maxRedirects = 5,
  } = options;

  // Build curl command with proper flags
  const curlArgs = [
    "curl",
    "-s", // Silent mode
    "-i", // Include headers in output
    "-X", method, // HTTP method
    "--max-time", String(Math.ceil(timeout / 1000)), // Timeout in seconds
  ];

  // Add redirect handling
  if (followRedirects) {
    curlArgs.push("-L"); // Follow redirects
    curlArgs.push("--max-redirs", String(maxRedirects));
  }

  // Add custom headers
  for (const [key, value] of Object.entries(headers)) {
    curlArgs.push("-H", `${key}: ${value}`);
  }

  // Add URL as last argument
  curlArgs.push(url);

  // Build shell command
  const curlCommand = build(curlArgs);

  try {
    await log(curlCommand);

    // Execute curl command
    const { stdOut, stdErr, exitCode } = await Neutralino.os.execCommand(curlCommand, {});

    // Handle curl errors
    if (exitCode !== 0) {
      await logError("curl command failed", new Error(stdErr), {
        exitCode,
        url,
        stderr: stdErr.substring(0, 200), // Limit error message length
      });

      // Map curl exit codes to meaningful errors
      if (exitCode === 28) {
        throw new TimeoutError(`Request timeout after ${timeout}ms`, timeout);
      }

      throw new NetworkError(
        `HTTP request failed: ${stdErr || "Unknown error"}`,
        { cause: new Error(stdErr), metadata: { exitCode, url } }
      );
    }

    // Parse response: separate headers from body
    const sections = stdOut.split(/\r?\n\r?\n/);
    const headerSection = sections[0];
    const body = sections.slice(1).join("\n\n");

    // Parse status line (supports HTTP/1.x and HTTP/2)
    const headerLines = headerSection.split(/\r?\n/);
    const statusLine = headerLines[0];
    // Match HTTP/1.0, HTTP/1.1, HTTP/2, HTTP/3 etc.
    const statusMatch = statusLine.match(/HTTP\/[\d.]+ (\d+)\s*(.*)/);

    if (!statusMatch) {
      await logError("Failed to parse HTTP status line", new Error("Invalid format"), {
        statusLine,
        headerSectionPreview: headerSection.substring(0, 300),
        stdOutPreview: stdOut.substring(0, 500),
      });
      throw new NetworkError(
        `Invalid HTTP response: ${statusLine}`,
        { metadata: { url, response: stdOut.substring(0, 200) } }
      );
    }

    const status = parseInt(statusMatch[1], 10);
    const statusText = statusMatch[2].trim() || "OK";

    // Parse headers
    const responseHeaders: Record<string, string> = {};
    for (let i = 1; i < headerLines.length; i++) {
      const colonIndex = headerLines[i].indexOf(":");
      if (colonIndex > 0) {
        const key = headerLines[i].substring(0, colonIndex).trim().toLowerCase();
        const value = headerLines[i].substring(colonIndex + 1).trim();
        responseHeaders[key] = value;
      }
    }

    // Create response object
    const response: HttpResponse = {
      status,
      statusText,
      url,
      headers: responseHeaders,

      async json<T = unknown>(): Promise<T> {
        try {
          return JSON.parse(body);
        } catch (error) {
          await logError("Failed to parse JSON response", error, {
            url,
            bodyPreview: body.substring(0, 200),
          });
          throw new NetworkError(
            `Invalid JSON response from ${url}`,
            { cause: error instanceof Error ? error : new Error(String(error)) }
          );
        }
      },

      async text(): Promise<string> {
        return body;
      },
    };

    return response;
  } catch (error) {
    // Re-throw known error types
    if (error instanceof TimeoutError || error instanceof NetworkError) {
      throw error;
    }

    // Wrap unknown errors
    await logError("Unexpected HTTP client error", error, { url });
    throw new NetworkError(
      `HTTP request failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error instanceof Error ? error : new Error(String(error)), metadata: { url } }
    );
  }
}

/**
 * Convenience function for GET requests
 */
export async function httpGet(
  url: string,
  options?: Omit<HttpClientOptions, "method">
): Promise<HttpResponse> {
  return httpFetch(url, { ...options, method: "GET" });
}

/**
 * Convenience function for POST requests
 */
export async function httpPost(
  url: string,
  options?: Omit<HttpClientOptions, "method">
): Promise<HttpResponse> {
  return httpFetch(url, { ...options, method: "POST" });
}
