import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ACCESS_TOKEN = "riat_contract_test";
const REFRESH_TOKEN = "rirt_contract_test";
const NODE_BIN = process.env.NODE || "node";
const TOOLKIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CUSTOMER_NUMBER = 80;
const USER_ID = "contract-user";
const SCOPES = [
  "ri:profile.read",
  "ri:schema.read",
  "ri:entity.search",
  "ri:entity.read",
  "ri:record.read",
  "ri:structure.read",
  "ri:analytics.read",
];

let base_url = "";
let agent_tools = [];
const requests = [];

async function main() {
  const temp_dir = await fs.mkdtemp(path.join(os.tmpdir(), "ri-agent-contract-"));
  const config_path = path.join(temp_dir, "agent-toolkit.json");
  process.env.REALINSIGHT_AGENT_CONFIG = config_path;

  const server = http.createServer(handle_request);
  await listen(server);

  try {
    const address = server.address();
    base_url = `http://127.0.0.1:${address.port}`;
    await write_config(config_path);

    const { AGENT_TOOLS } = await import("../src/tool-definitions.mjs");
    const { call_agent_tool } = await import("../src/agent-tools.mjs");
    const { enforce_tool_result_limit } = await import("../src/tool-result-limits.mjs");

    agent_tools = AGENT_TOOLS;

    await run_doctor_smoke(config_path);
    await run_tool_call_smoke(call_agent_tool);
    await run_mcp_smoke(config_path);
    run_result_limit_smoke(enforce_tool_result_limit);

    assert(requests.some((request) => request.path === "/agent/metadata"), "doctor did not request /agent/metadata");

    console.log(JSON.stringify({
      ok: true,
      tool_count: agent_tools.length,
      requests: requests.length,
    }));
  }
  finally {
    server.closeAllConnections?.();
    server.close();
    await fs.rm(temp_dir, { recursive: true, force: true });
  }
}

async function run_doctor_smoke(config_path) {
  const result = await run_node_cli(["doctor", "--json"], config_path);

  assert(result.status === 0, `doctor failed: ${result.stderr || result.stdout}`);
  assert(!result.stdout.includes(ACCESS_TOKEN), "doctor output leaked access token");
  assert(!result.stdout.includes(REFRESH_TOKEN), "doctor output leaked refresh token");

  const payload = JSON.parse(result.stdout);
  assert(payload.ok === true, "doctor did not report ok=true");
  assert(payload.summary.fail === 0, "doctor reported failures");
  assert(payload.checks.some((check) => check.name === "tool_inventory" && check.status === "pass"), "doctor did not pass tool inventory check");
}

async function run_tool_call_smoke(call_agent_tool) {
  const auth_status_result = await call_agent_tool("auth_status", {});
  assert(auth_status_result.status === "connected", "auth_status did not report connected");

  const feature_result = await call_agent_tool("search_features", { query: "loan" });
  assert(feature_result.items[0].feature_code === "Loan", "search_features did not return Loan");

  const field_result = await call_agent_tool("search_fields", { query: "balance", feature_code: "Loan" });
  assert(field_result.items[0].schema_code === "Loan.Balance", "search_fields did not return Loan.Balance");

  const get_fields_result = await call_agent_tool("get_fields", { feature_code: "Loan" });
  assert(get_fields_result.items.some((field) => field.schema_code === "Loan.LoanNumber"), "get_fields did not return Loan.LoanNumber");

  const entity_result = await call_agent_tool("search_entities", { query: "Madison", feature_code: "Loan" });
  assert(entity_result.items[0].entity_id === "loan-1", "search_entities did not return loan-1");

  const children_result = await call_agent_tool("get_children", {
    feature_code: "LoanPaymentHistory",
    parent_ids: ["loan-1"],
    limit: 5,
  });
  assert(children_result.items[0].entity_id === "payment-1", "get_children did not return payment-1");

  const structure_result = await call_agent_tool("get_entity_structure", {
    traversal: "parent",
    entity_ids: ["loan-1"],
  });
  assert(structure_result.items[0].nodes.some((node) => node.entity_id === "deal-1"), "get_entity_structure did not return deal-1");

  const record_result = await call_agent_tool("get_records", {
    feature_code: "Loan",
    entity_ids: ["loan-1"],
    schema_codes: ["Loan.LoanNumber"],
  });
  assert(record_result.items[0].values[0].value === "LN-001", "get_records did not return LN-001");

  const dashboard_pages_result = await call_agent_tool("list_dashboard_pages", {});
  assert(dashboard_pages_result.items[0].page_id === "page-1", "list_dashboard_pages did not return page-1");

  const dashboard_page_result = await call_agent_tool("get_dashboard_page", { page_id: "page-1" });
  assert(dashboard_page_result.items[0].analytics[0].analytic_report_id === "analytic-1", "get_dashboard_page did not return analytic-1");

  const analytic_data_result = await call_agent_tool("get_analytic_data", { report_id: "analytic-1", limit: 1 });
  assert(analytic_data_result.items[0].rows[0]["col-tenant"] === "Tenant A", "get_analytic_data did not return Tenant A");

  const workbenches_result = await call_agent_tool("list_workbenches", {});
  assert(workbenches_result.items[0].workbench_id === "workbench-list-1", "list_workbenches did not return workbench-list-1");

  const workbench_data_result = await call_agent_tool("get_workbench_data", { workbench_id: "workbench-list-1", limit: 1 });
  assert(workbench_data_result.items[0].rows[0]["col-balance"] === 1250000, "get_workbench_data did not return balance");

}

async function run_mcp_smoke(config_path) {
  const child = spawn(NODE_BIN, ["./src/ri-agent.mjs", "mcp"], {
    cwd: TOOLKIT_ROOT,
    env: {
      ...process.env,
      REALINSIGHT_AGENT_CONFIG: config_path,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const responses = [];
  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += String(chunk);

    while (stdout.includes("\n")) {
      const index = stdout.indexOf("\n");
      const line = stdout.slice(0, index);
      stdout = stdout.slice(index + 1);

      if (line.trim()) responses.push(JSON.parse(line));
    }
  });
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2025-06-18" },
  }) + "\n");
  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  }) + "\n");
  child.stdin.write(JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "search_features",
      arguments: { query: "loan" },
    },
  }) + "\n");
  child.stdin.end();

  const exit_code = await wait_for_child(child);
  assert(exit_code === 0, `mcp exited with ${exit_code}: ${stderr}`);
  assert(responses.find((response) => response.id === 1)?.result?.serverInfo?.name === "realinsight-agent-toolkit", "mcp initialize failed");
  assert(responses.find((response) => response.id === 2)?.result?.tools?.length === agent_tools.length, "mcp tools/list returned unexpected tool count");

  const call_response = responses.find((response) => response.id === 3);
  assert(call_response?.result?.structuredContent?.items?.[0]?.feature_code === "Loan", "mcp tools/call did not return Loan");
}

function run_result_limit_smoke(enforce_tool_result_limit) {
  const original_limit = process.env.RI_AGENT_MAX_TOOL_RESULT_BYTES;
  process.env.RI_AGENT_MAX_TOOL_RESULT_BYTES = "20000";

  try {
    const payload = {
      items: Array.from({ length: 1000 }, (_, index) => ({
        entity_id: `entity-${index}`,
        value: "x".repeat(200),
      })),
      count: 1000,
      is_truncated: false,
      warnings: [],
      provenance: {
        tool: "contract",
        source: "test",
      },
    };
    const limited = enforce_tool_result_limit("contract", payload);
    const size = new TextEncoder().encode(JSON.stringify(limited)).length;

    assert(size <= 20000, `limited payload too large: ${size}`);
    assert(limited.is_truncated === true, "limited payload was not marked truncated");
    assert(limited.items.length < payload.items.length, "limited payload was not trimmed");
    assert(limited.warnings.length > 0, "limited payload warning missing");
  }
  finally {
    if (original_limit === undefined) {
      delete process.env.RI_AGENT_MAX_TOOL_RESULT_BYTES;
    }
    else {
      process.env.RI_AGENT_MAX_TOOL_RESULT_BYTES = original_limit;
    }
  }
}

async function handle_request(request, response) {
  const url = new URL(request.url, base_url || "http://127.0.0.1");
  const body = await read_json_body(request);
  requests.push({
    method: request.method,
    path: url.pathname,
  });

  if (url.pathname.startsWith("/agent/") || url.pathname === "/oauth/me") {
    const authorization = request.headers.authorization || "";

    if (authorization !== `Bearer ${ACCESS_TOKEN}`) {
      write_json(response, 401, {
        error: "invalid_token",
        error_description: "Missing or invalid bearer token.",
      });
      return;
    }
  }

  if (request.method === "GET" && url.pathname === "/.well-known/oauth-protected-resource") {
    write_json(response, 200, {
      resource: base_url,
      authorization_servers: [base_url],
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/oauth/me") {
    write_json(response, 200, {
      credential_type: "oauth_access_token",
      client_id: "realinsight-agent-toolkit",
      grant_id: "grant-1",
      token_id: "token-1",
      customer_number: CUSTOMER_NUMBER,
      customer_id: "customer-80",
      user_id: USER_ID,
      scopes: SCOPES,
      expires_at_utc: new Date(Date.now() + 3600000).toISOString(),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/metadata") {
    write_json(response, 200, {
      api_version: "0.1.0",
        tools: agent_tools.map((tool) => ({
          name: tool.name,
          route: tool.route,
          required_scope: tool.scope,
          description: tool.description,
        })).filter((tool) => !agent_tools.find((local_tool) => local_tool.name === tool.name)?.local_only),
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/schema/features/search") {
    write_json(response, 200, agent_result("search_features", "ri:schema.read", [
      {
        feature_code: "Loan",
        type_name: "Loan",
        type: "MASTER",
        master_feature_code: "Loan",
        parent_feature_code: "Deal",
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/schema/fields/search") {
    write_json(response, 200, agent_result("search_fields", "ri:schema.read", [
      {
        schema_code: "Loan.Balance",
        feature_code: "Loan",
        field_name: "Balance",
        display: "Balance",
        field_type: "MONEY",
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/schema/features/Loan/fields") {
    write_json(response, 200, agent_result("get_fields", "ri:schema.read", [
      {
        schema_code: "Loan.LoanNumber",
        feature_code: "Loan",
        field_name: "LoanNumber",
        display: "Loan Number",
        field_type: "TEXT",
      },
      {
        schema_code: "Loan.Balance",
        feature_code: "Loan",
        field_name: "Balance",
        display: "Balance",
        field_type: "MONEY",
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/entities/search") {
    write_json(response, 200, agent_result("search_entities", "ri:entity.search", [
      {
        entity_id: "loan-1",
        feature_code: "Loan",
        schema_code: "Loan.LoanNumber",
        field_name: "LoanNumber",
        matched_value: url.searchParams.get("q") || "Madison",
        parent_id: "deal-1",
        master_id: "deal-1",
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/entities/children") {
    assert(body.feature_code === "LoanPaymentHistory", "unexpected child feature in contract request");
    write_json(response, 200, agent_result("get_children", "ri:entity.read", [
      {
        entity_id: "payment-1",
        feature_code: "LoanPaymentHistory",
        parent_id: "loan-1",
        master_id: "deal-1",
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/entities/structure") {
    write_json(response, 200, agent_result("get_entity_structure", "ri:structure.read", [
      {
        nodes: [
          {
            entity_id: "loan-1",
            feature_code: "Loan",
            parent_id: "deal-1",
            master_id: "deal-1",
          },
          {
            entity_id: "deal-1",
            feature_code: "Deal",
            parent_id: "",
            master_id: "deal-1",
          },
        ],
        edges: [
          {
            from_entity_id: "loan-1",
            to_entity_id: "deal-1",
            relationship: "parent",
            feature_code: "Deal",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "POST" && url.pathname === "/agent/records/get") {
    write_json(response, 200, agent_result("get_records", "ri:record.read", [
      {
        entity_id: "loan-1",
        feature_code: "Loan",
        parent_id: "deal-1",
        master_id: "deal-1",
        field_profile: "explicit_fields",
        values: [
          {
            schema_code: "Loan.LoanNumber",
            field_name: "LoanNumber",
            display: "Loan Number",
            field_type: "TEXT",
            value: "LN-001",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/dashboards/pages") {
    write_json(response, 200, agent_result("list_dashboard_pages", "ri:analytics.read", [
      {
        page_id: "page-1",
        title: "Portfolio Overview",
        description: "Core portfolio dashboard",
        page_type: "USER",
        page_order: 1,
        analytic_count: 1,
        filter_count: 1,
        is_home_snapshot: true,
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/dashboards/pages/page-1") {
    write_json(response, 200, agent_result("get_dashboard_page", "ri:analytics.read", [
      {
        page_id: "page-1",
        title: "Portfolio Overview",
        analytics: [
          {
            analytic_report_id: "analytic-1",
            analytic_report_name: "Top Tenants",
            base_report_id: "report-1",
            base_report_name: "Tenant List",
            cache_status: "ready",
            row_count: 2,
          },
        ],
        filters: [
          {
            filter_id: "Market",
            label: "Market",
            schema_code: "CREMaster.Market",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/analytics/analytic-1/data") {
    write_json(response, 200, agent_result("get_analytic_data", "ri:analytics.read", [
      {
        source_type: "analytic",
        report_id: "analytic-1",
        report_name: "Top Tenants",
        analytic_report_id: "analytic-1",
        base_report_id: "report-1",
        base_report_name: "Tenant List",
        cache_key: "cache:user:contract-user:analytic:analytic-1",
        cache_status: "ready",
        total_rows: 1,
        offset: 0,
        limit: Number(url.searchParams.get("limit") || 100),
        columns: [
          {
            column_id: "col-tenant",
            label: "Tenant",
            schema_code: "RentRoll.TenantName",
          },
        ],
        rows: [
          {
            "col-tenant": "Tenant A",
          },
        ],
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/workbenches") {
    write_json(response, 200, agent_result("list_workbenches", "ri:analytics.read", [
      {
        workbench_id: "workbench-list-1",
        workbench_code: "LOAN_WORKBENCH",
        workbench_item_name: "Active Loans",
        list_report_id: "report-2",
        list_report_name: "Loan List",
        cache_status: "ready",
        row_count: 1,
      },
    ]));
    return;
  }

  if (request.method === "GET" && url.pathname === "/agent/workbenches/workbench-list-1/data") {
    write_json(response, 200, agent_result("get_workbench_data", "ri:analytics.read", [
      {
        source_type: "workbench",
        report_id: "report-2",
        report_name: "Loan List",
        workbench_id: "workbench-list-1",
        workbench_code: "LOAN_WORKBENCH",
        cache_key: "cache:user:contract-user:workbench:workbench-list-1",
        cache_status: "ready",
        total_rows: 1,
        offset: 0,
        limit: Number(url.searchParams.get("limit") || 100),
        columns: [
          {
            column_id: "col-balance",
            label: "Balance",
            schema_code: "Loan.Balance",
          },
        ],
        rows: [
          {
            "col-balance": 1250000,
          },
        ],
      },
    ]));
    return;
  }

  write_json(response, 404, {
    error: "not_found",
    error_description: `${request.method} ${url.pathname} was not mocked.`,
  });
}

function agent_result(tool, required_scope, items) {
  return {
    items,
    count: items.length,
    is_truncated: false,
    provenance: {
      tool,
      source: "mock_core_api",
      required_scope,
      customer_number: CUSTOMER_NUMBER,
      customer_id: "customer-80",
      generated_at_utc: new Date().toISOString(),
    },
  };
}

async function run_node_cli(args, config_path) {
  return await new Promise((resolve, reject) => {
    const child = spawn(NODE_BIN, ["./src/ri-agent.mjs", ...args], {
      cwd: TOOLKIT_ROOT,
      env: {
        ...process.env,
        REALINSIGHT_AGENT_CONFIG: config_path,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function wait_for_child(child) {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
}

async function write_config(config_path) {
  await fs.writeFile(config_path, JSON.stringify({
    version: 1,
    active_profile: "default",
    profiles: {
      default: {
        base_url,
        client_id: "realinsight-agent-toolkit",
        access_token: ACCESS_TOKEN,
        refresh_token: REFRESH_TOKEN,
        token_type: "Bearer",
        expires_at_utc: new Date(Date.now() + 3600000).toISOString(),
        scope: SCOPES,
        customer_number: CUSTOMER_NUMBER,
        user_id: USER_ID,
        updated_at_utc: new Date().toISOString(),
      },
    },
  }, null, 2));
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

async function read_json_body(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function write_json(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json",
  });
  response.end(JSON.stringify(payload));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
