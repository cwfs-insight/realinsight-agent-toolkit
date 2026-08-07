import { format_error_message } from "./http.mjs";
import { call_agent_tool } from "./agent-tools.mjs";
import { build_error_response, is_plain_object, JsonRpcError } from "./json-rpc.mjs";
import {
  AGENT_TOOLS,
  MCP_INSTRUCTIONS,
  MCP_MODERN_PROTOCOL_VERSION,
  MCP_PROTOCOL_VERSION,
  MCP_SERVER_INFO,
  MCP_SUPPORTED_PROTOCOL_VERSIONS,
} from "./tool-definitions.mjs";

export async function start_mcp_server() {
  process.stdin.setEncoding("utf8");
  console.error("Realinsight Agent Toolkit MCP server started on stdio.");

  let buffer = "";
  let chain = Promise.resolve();

  await new Promise((resolve, reject) => {
    process.stdin.on("data", (chunk) => {
      buffer += chunk;

      while (true) {
        const index = buffer.indexOf("\n");
        if (index < 0) break;

        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        chain = chain.then(() => handle_mcp_line(line)).catch((error) => {
          console.error(`MCP message handling failed: ${format_error_message(error)}`);
        });
      }
    });

    process.stdin.on("end", () => {
      if (buffer.trim()) {
        chain = chain.then(() => handle_mcp_line(buffer)).catch((error) => {
          console.error(`MCP final message handling failed: ${format_error_message(error)}`);
        });
      }

      chain.then(resolve, reject);
    });

    process.stdin.on("error", reject);
  });
}

async function handle_mcp_line(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  let message;

  try {
    message = JSON.parse(trimmed);
  }
  catch (error) {
    write_json_rpc(build_error_response(null, -32700, "Parse error", { message: error.message }));
    return;
  }

  if (Array.isArray(message)) {
    for (const item of message) {
      await handle_mcp_message(item);
    }

    return;
  }

  await handle_mcp_message(message);
}

async function handle_mcp_message(message) {
  if (!is_plain_object(message) || message.jsonrpc !== "2.0") {
    write_json_rpc(build_error_response(message?.id ?? null, -32600, "Invalid Request"));
    return;
  }

  if (!message.method) return;

  if (typeof message.method !== "string") {
    if (message.id !== undefined) write_json_rpc(build_error_response(message.id, -32600, "Invalid Request"));
    return;
  }

  if (message.id === undefined || message.id === null) {
    await handle_mcp_notification(message);
    return;
  }

  try {
    const is_modern_request = validate_protocol_request(message);
    const result = add_modern_result_metadata(
      await handle_mcp_request(message, is_modern_request),
      message.method,
      is_modern_request,
    );
    write_json_rpc({
      jsonrpc: "2.0",
      id: message.id,
      result,
    });
  }
  catch (error) {
    if (error instanceof JsonRpcError) {
      write_json_rpc(build_error_response(message.id, error.code, error.message, error.data));
      return;
    }

    write_json_rpc(build_error_response(message.id, -32603, "Internal error", {
      message: format_error_message(error),
    }));
  }
}

async function handle_mcp_notification(message) {
  if (message.method === "notifications/initialized") return;
  if (message.method === "notifications/cancelled") return;

  console.error(`Ignored MCP notification: ${message.method}`);
}

async function handle_mcp_request(message, is_modern_request) {
  switch (message.method) {
    case "initialize":
      if (is_modern_request) throw new JsonRpcError(-32601, "Method not found: initialize");
      return build_mcp_initialize_result(message.params);
    case "server/discover":
      if (!is_modern_request) throw new JsonRpcError(-32601, "Method not found: server/discover");
      return build_mcp_discover_result();
    case "ping":
      if (is_modern_request) throw new JsonRpcError(-32601, "Method not found: ping");
      return {};
    case "tools/list":
      return { tools: AGENT_TOOLS.map(to_mcp_tool_definition) };
    case "tools/call":
      return await handle_mcp_tool_call(message.params);
    case "resources/list":
      return { resources: [] };
    case "prompts/list":
      return { prompts: [] };
    default:
      throw new JsonRpcError(-32601, `Method not found: ${message.method}`);
  }
}

function validate_protocol_request(message) {
  const metadata = is_plain_object(message.params?._meta)
    ? message.params._meta
    : null;
  const requested_version = metadata?.["io.modelcontextprotocol/protocolVersion"];

  if (requested_version === undefined) return false;
  if (typeof requested_version !== "string" || !MCP_SUPPORTED_PROTOCOL_VERSIONS.includes(requested_version)) {
    throw new JsonRpcError(-32022, "Unsupported protocol version", {
      supported: MCP_SUPPORTED_PROTOCOL_VERSIONS,
      requested: requested_version ?? null,
    });
  }

  if (requested_version !== MCP_MODERN_PROTOCOL_VERSION) return false;
  if (!is_plain_object(metadata["io.modelcontextprotocol/clientCapabilities"])) {
    throw new JsonRpcError(
      -32602,
      "params._meta.io.modelcontextprotocol/clientCapabilities must be an object.",
    );
  }

  return true;
}

function add_modern_result_metadata(result, method, is_modern_request) {
  if (!is_modern_request || !is_plain_object(result)) return result;

  const modern_result = {
    ...result,
    resultType: result.resultType ?? "complete",
    _meta: {
      ...(is_plain_object(result._meta) ? result._meta : {}),
      "io.modelcontextprotocol/serverInfo": MCP_SERVER_INFO,
    },
  };

  if (method === "server/discover" || method.endsWith("/list")) {
    modern_result.ttlMs = 300000;
    modern_result.cacheScope = "private";
  }

  return modern_result;
}

function build_mcp_discover_result() {
  return {
    supportedVersions: MCP_SUPPORTED_PROTOCOL_VERSIONS,
    capabilities: build_mcp_capabilities(),
    instructions: MCP_INSTRUCTIONS,
  };
}

function build_mcp_capabilities() {
  return {
    tools: {
      listChanged: false,
    },
  };
}

function build_mcp_initialize_result(params) {
  const requested_version = is_plain_object(params) ? params.protocolVersion : null;
  const protocol_version = MCP_SUPPORTED_PROTOCOL_VERSIONS.includes(requested_version)
    && requested_version !== MCP_MODERN_PROTOCOL_VERSION
    ? requested_version
    : MCP_PROTOCOL_VERSION;

  return {
    protocolVersion: protocol_version,
    capabilities: build_mcp_capabilities(),
    serverInfo: MCP_SERVER_INFO,
    instructions: MCP_INSTRUCTIONS,
  };
}

async function handle_mcp_tool_call(params) {
  if (!is_plain_object(params)) {
    throw new JsonRpcError(-32602, "tools/call params must be an object.");
  }

  const name = params.name;
  if (typeof name !== "string" || !name.trim()) {
    throw new JsonRpcError(-32602, "tools/call requires params.name.");
  }

  const tool = AGENT_TOOLS.find((candidate) => candidate.name === name);
  if (!tool) {
    throw new JsonRpcError(-32602, `Unknown tool: ${name}`);
  }

  const args = params.arguments === undefined
    ? {}
    : params.arguments;

  if (!is_plain_object(args)) {
    throw new JsonRpcError(-32602, "tools/call params.arguments must be an object when supplied.");
  }

  try {
    const payload = await call_agent_tool(name, args);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(payload, null, 2),
        },
      ],
      structuredContent: payload,
      isError: false,
    };
  }
  catch (error) {
    if (error instanceof JsonRpcError) throw error;

    return {
      content: [
        {
          type: "text",
          text: format_error_message(error),
        },
      ],
      isError: true,
    };
  }
}

function to_mcp_tool_definition(tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: {
      readOnlyHint: tool.readOnlyHint ?? true,
      destructiveHint: tool.destructiveHint ?? false,
      idempotentHint: tool.idempotentHint ?? true,
      openWorldHint: false,
    },
  };
}

function write_json_rpc(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}
