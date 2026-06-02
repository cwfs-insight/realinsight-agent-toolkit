import {
  DEFAULT_MAX_TOOL_RESULT_BYTES,
  MIN_TOOL_RESULT_BYTES,
} from "./tool-definitions.mjs";

const encoder = new TextEncoder();

export function enforce_tool_result_limit(tool_name, payload) {
  const max_bytes = get_max_tool_result_bytes();
  const size = json_size_bytes(payload);

  if (size <= max_bytes) return payload;

  const limited = clone_json(payload);
  const warning = `Result for ${tool_name} exceeded ${max_bytes} bytes and was truncated by the local Realinsight Agent Toolkit before returning to the MCP client. Narrow the query, lower the limit, request fewer fields, or for analytic/workbench tables use CSV/entity-ref helper tools and page results into a temp file.`;

  append_warning(limited, warning);
  limited.is_truncated = true;

  if (Array.isArray(limited.items)) {
    limited.items = trim_items_to_fit(limited, limited.items, max_bytes);
    limited.count = limited.items.length;

    if (json_size_bytes(limited) <= max_bytes) {
      return limited;
    }

    limited.items = [];
    limited.count = 0;
  }

  if (json_size_bytes(limited) <= max_bytes) {
    return limited;
  }

  return {
    items: [],
    count: 0,
    is_truncated: true,
    warnings: [warning, "The original result metadata was also too large, so only this truncation envelope was returned."],
    provenance: payload?.provenance || {
      tool: tool_name,
      source: "local_agent_toolkit",
    },
  };
}

export function get_max_tool_result_bytes() {
  const configured = Number(process.env.RI_AGENT_MAX_TOOL_RESULT_BYTES || DEFAULT_MAX_TOOL_RESULT_BYTES);

  if (!Number.isFinite(configured)) return DEFAULT_MAX_TOOL_RESULT_BYTES;

  return Math.max(MIN_TOOL_RESULT_BYTES, Math.floor(configured));
}

function trim_items_to_fit(payload, original_items, max_bytes) {
  let low = 0;
  let high = original_items.length;
  let best = [];

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    payload.items = original_items.slice(0, mid);

    if (json_size_bytes(payload) <= max_bytes) {
      best = payload.items;
      low = mid + 1;
    }
    else {
      high = mid - 1;
    }
  }

  return best;
}

function append_warning(payload, warning) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;

  payload.warnings = Array.isArray(payload.warnings)
    ? [...payload.warnings, warning]
    : [warning];
}

function json_size_bytes(value) {
  return encoder.encode(JSON.stringify(value)).length;
}

function clone_json(value) {
  return JSON.parse(JSON.stringify(value));
}
