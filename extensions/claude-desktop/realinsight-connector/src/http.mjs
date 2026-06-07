export class HttpJsonError extends Error {
  constructor(status, error, description, payload) {
    super(description || error || `HTTP ${status}`);
    this.name = "HttpJsonError";
    this.status = status;
    this.error = error;
    this.description = description;
    this.payload = payload;
  }
}

export class HttpTransportError extends Error {
  constructor(category, message, cause) {
    super(message, { cause });
    this.name = "HttpTransportError";
    this.category = category;
    this.code = cause?.cause?.code || cause?.code || "";
  }
}

const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const DEFAULT_SAFE_READ_RETRY_COUNT = 2;
const DEFAULT_RETRY_DELAY_MS = 250;
const MAX_RETRY_DELAY_MS = 2000;
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

export async function request_json(url, options = {}) {
  const retry_count = Math.max(0, Number(options.retry_count || 0));
  let last_error = null;

  for (let attempt = 0; attempt <= retry_count; attempt++) {
    try {
      return await request_json_once(url, options);
    }
    catch (error) {
      last_error = normalize_request_error(error);

      if (attempt >= retry_count || !is_retryable_error(last_error)) {
        throw last_error;
      }

      await sleep(retry_delay_ms(attempt, options.retry_delay_ms));
    }
  }

  throw last_error;
}

async function request_json_once(url, options) {
  const headers = {
    Accept: "application/json",
  };
  const request = {
    method: options.method || "GET",
    headers,
  };
  let timeout_id = null;

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    request.body = JSON.stringify(options.body);
  }

  if (options.bearer_token) {
    headers.Authorization = `Bearer ${options.bearer_token}`;
  }

  const timeout_ms = Number(options.timeout_ms || DEFAULT_REQUEST_TIMEOUT_MS);

  if (timeout_ms > 0) {
    const controller = new AbortController();
    timeout_id = setTimeout(() => controller.abort(), timeout_ms);
    request.signal = controller.signal;
  }

  try {
    const response = await fetch(url, request);
    const text = await response.text();
    const payload = parse_json_or_text(text);

    if (!response.ok) {
      throw new HttpJsonError(
        response.status,
        payload && payload.error ? payload.error : `http_${response.status}`,
        payload && payload.error_description ? payload.error_description : response.statusText,
        payload,
      );
    }

    return payload;
  }
  finally {
    if (timeout_id) clearTimeout(timeout_id);
  }
}

export function build_url(base_url, route, query) {
  const base = String(base_url || "").replace(/\/+$/, "");
  const normalized_route = String(route || "").replace(/^\/+/, "");
  const url = new URL(`${base}/${normalized_route}`);

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null || item === "") continue;
        url.searchParams.append(key, String(item));
      }

      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export function request_agent_json(profile, route, query) {
  return request_json(build_url(profile.base_url, route, query), {
    method: "GET",
    bearer_token: profile.access_token,
    retry_count: DEFAULT_SAFE_READ_RETRY_COUNT,
  });
}

export function post_agent_json(profile, route, body, options = {}) {
  return request_json(build_url(profile.base_url, route), {
    method: "POST",
    bearer_token: profile.access_token,
    body,
    timeout_ms: options.timeout_ms,
    retry_count: options.retry_count,
  });
}

export function post_agent_read_json(profile, route, body) {
  return post_agent_json(profile, route, body, {
    retry_count: DEFAULT_SAFE_READ_RETRY_COUNT,
  });
}

export function delete_agent_json(profile, route, body) {
  return request_json(build_url(profile.base_url, route), {
    method: "DELETE",
    bearer_token: profile.access_token,
    body,
  });
}

export function format_error_message(error) {
  if (error instanceof HttpJsonError) {
    return `${error.error}: ${error.description}`;
  }

  if (error instanceof HttpTransportError) {
    return `${error.category}: ${error.message}`;
  }

  if (error?.cause?.code) {
    const endpoint = [
      error.cause.address,
      error.cause.port,
    ].filter(Boolean).join(":");

    return endpoint
      ? `${error.message}: ${error.cause.code} ${endpoint}`
      : `${error.message}: ${error.cause.code}`;
  }

  return error && error.message ? error.message : String(error);
}

function normalize_request_error(error) {
  if (error instanceof HttpJsonError || error instanceof HttpTransportError) {
    return error;
  }

  if (error?.name === "AbortError") {
    return new HttpTransportError("timeout", "Request timed out.", error);
  }

  if (error?.message === "fetch failed" || error?.cause?.code) {
    return new HttpTransportError("network_error", transport_error_message(error), error);
  }

  return error;
}

function transport_error_message(error) {
  if (!error?.cause?.code) {
    return error?.message || "Network request failed.";
  }

  const endpoint = [
    error.cause.address,
    error.cause.port,
  ].filter(Boolean).join(":");

  return endpoint
    ? `${error.message}: ${error.cause.code} ${endpoint}`
    : `${error.message}: ${error.cause.code}`;
}

function is_retryable_error(error) {
  if (error instanceof HttpTransportError) return true;
  if (error instanceof HttpJsonError) return RETRYABLE_HTTP_STATUSES.has(error.status);

  return false;
}

function retry_delay_ms(attempt, override_delay_ms) {
  const base_delay = Math.max(0, Number(override_delay_ms || DEFAULT_RETRY_DELAY_MS));
  const delay = base_delay * (2 ** attempt);

  return Math.min(delay, MAX_RETRY_DELAY_MS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parse_json_or_text(text) {
  if (!text) return {};

  try {
    return JSON.parse(text);
  }
  catch {
    return { text };
  }
}
