/** Failure of a places or routing request. The message 'network' means no connection. */
export class ApiError extends Error {}

const REQUEST_TIMEOUT_MS = 15000;

/**
 * fetch() that gives up after a while instead of hanging forever, and reports
 * connection problems and timeouts as ApiError('network').
 */
export async function request(
  url: string,
  init?: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new ApiError('network');
  } finally {
    clearTimeout(timer);
  }
}
