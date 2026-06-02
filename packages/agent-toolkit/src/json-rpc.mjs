export class JsonRpcError extends Error {
  constructor(code, message, data) {
    super(message);
    this.name = "JsonRpcError";
    this.code = code;
    this.data = data;
  }
}

export function required_string(input, name, message) {
  const value = optional_string(input, name);

  if (!value) {
    throw new JsonRpcError(-32602, message || `${name} is required.`);
  }

  return value;
}

export function optional_string(input, name) {
  if (!is_plain_object(input)) return undefined;

  const value = input[name];
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
    throw new JsonRpcError(-32602, `${name} must be a string.`);
  }

  const text = String(value).trim();
  return text || undefined;
}

export function optional_string_array(input, name) {
  if (!is_plain_object(input)) return undefined;

  const value = input[name];
  if (value === undefined || value === null || value === "") return undefined;

  const values = Array.isArray(value) ? value : [value];
  const strings = [];

  for (const item of values) {
    if (item === undefined || item === null || item === "") continue;

    if (typeof item !== "string" && typeof item !== "number" && typeof item !== "boolean") {
      throw new JsonRpcError(-32602, `${name} must be a string or array of strings.`);
    }

    for (const part of String(item).split(",")) {
      const text = part.trim();
      if (text) strings.push(text);
    }
  }

  return strings.length > 0 ? strings : undefined;
}

export function optional_integer(input, name) {
  if (!is_plain_object(input)) return undefined;

  const value = input[name];
  if (value === undefined || value === null || value === "") return undefined;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new JsonRpcError(-32602, `${name} must be an integer.`);
  }

  return parsed;
}

export function optional_boolean(input, name) {
  if (!is_plain_object(input)) return undefined;

  const value = input[name];
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }

  throw new JsonRpcError(-32602, `${name} must be a boolean.`);
}

export function is_plain_object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function build_error_response(id, code, message, data) {
  const error = {
    code,
    message,
  };

  if (data !== undefined) error.data = data;

  return {
    jsonrpc: "2.0",
    id,
    error,
  };
}
