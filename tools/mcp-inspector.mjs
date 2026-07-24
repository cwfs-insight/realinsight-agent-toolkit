#!/usr/bin/env node
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RI_AGENT = path.join(REPO_ROOT, "packages/agent-toolkit/src/ri-agent.mjs");
const TMP_DIR = path.join(REPO_ROOT, ".tmp");
const CONFIG_FILE = path.join(TMP_DIR, "mcp-inspector-config.json");
const MAX_TOOL_RESULT_BYTES = "240000";
const DEFAULT_PORT = "6274";

const ENV_DEFAULTS = {
  prod: {
    code: "prod",
    base_url: "https://www.realinsight.cloud/api/v1",
    profile: "realinsight-prod",
    server_name: "realinsight-agent-toolkit",
    config_suffix: "",
  },
  dev: {
    code: "dev",
    base_url: process.env.RI_AGENT_DEV_BASE_URL || "https://www.ri2-dev.com/api/v1",
    profile: "realinsight-dev",
    server_name: "realinsight-agent-toolkit-dev",
    config_suffix: "dev",
  },
  qa: {
    code: "qa",
    base_url: process.env.RI_AGENT_QA_BASE_URL || "https://www.ri2-qa.com/api/v1",
    profile: "realinsight-qa",
    server_name: "realinsight-agent-toolkit-qa",
    config_suffix: "qa",
  },
  localhost: {
    code: "localhost",
    base_url: process.env.RI_AGENT_LOCALHOST_BASE_URL || "http://localhost:7000",
    profile: "realinsight-localhost",
    server_name: "realinsight-agent-toolkit-localhost",
    config_suffix: "localhost",
  },
};

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});

async function main() {
  const options = parse_args(process.argv.slice(2));

  if (options.help) {
    print_help();
    return;
  }

  const env = resolve_env(options.env);
  const config = options.transport === "http"
    ? build_http_config(env)
    : options.transport === "remote"
      ? build_remote_config(env)
      : build_stdio_config(env);

  await fs.mkdir(TMP_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`);

  print_banner(env, options);
  await launch_inspector(env, options, options.inspector_args);
}

function parse_args(argv) {
  const options = {
    env: "dev",
    transport: "stdio",
    port: process.env.CLIENT_PORT || DEFAULT_PORT,
    inspector_args: [],
    help: false,
  };

  let passthrough = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [name, inline_value] = arg.includes("=") ? arg.split(/=(.*)/s, 2) : [arg, null];
    const take = () => {
      if (inline_value !== null) return inline_value;
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };

    if (passthrough) {
      options.inspector_args.push(arg);
      continue;
    }

    switch (name) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--env":
        options.env = normalize_env_code(take());
        break;
      case "--transport":
        options.transport = normalize_transport(take());
        break;
      case "--port":
        options.port = take();
        break;
      case "--":
        passthrough = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}. Use --help for usage.`);
    }
  }

  return options;
}

function normalize_env_code(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "production") return "prod";
  if (normalized === "development") return "dev";
  if (!ENV_DEFAULTS[normalized]) {
    throw new Error(`Unsupported environment: ${value}. Use prod, dev, qa, or localhost.`);
  }
  return normalized;
}

function normalize_transport(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "stdio") return "stdio";
  if (normalized === "http" || normalized === "streamable-http" || normalized === "streamable_http") return "http";
  if (normalized === "remote" || normalized === "mcp-remote" || normalized === "mcp_remote") return "remote";
  throw new Error(`Unsupported transport: ${value}. Use stdio, http, or remote.`);
}

function resolve_env(env_code) {
  const defaults = ENV_DEFAULTS[env_code];
  if (!defaults) throw new Error(`Unsupported environment: ${env_code}. Use prod, dev, qa, or localhost.`);
  return {
    ...defaults,
    base_url: normalize_base_url(defaults.base_url),
    config_path: credential_path(defaults.config_suffix),
  };
}

function credential_path(suffix) {
  const filename = suffix ? `agent-toolkit-${suffix}.json` : "agent-toolkit.json";
  return path.join(os.homedir(), ".realinsight", filename);
}

function normalize_base_url(value) {
  return String(value || "").replace(/\/+$/g, "");
}

function build_stdio_config(env) {
  return {
    mcpServers: {
      [env.server_name]: {
        type: "stdio",
        command: "node",
        args: [RI_AGENT, "mcp"],
        env: {
          RI_AGENT_BASE_URL: env.base_url,
          RI_AGENT_PROFILE: env.profile,
          REALINSIGHT_AGENT_CONFIG: env.config_path,
          RI_AGENT_MAX_TOOL_RESULT_BYTES: MAX_TOOL_RESULT_BYTES,
        },
      },
    },
  };
}

function build_http_config(env) {
  return {
    mcpServers: {
      [env.server_name]: {
        type: "streamable-http",
        url: `${env.base_url}/mcp`,
      },
    },
  };
}

function build_remote_config(env) {
  return {
    mcpServers: {
      [env.server_name]: {
        type: "stdio",
        command: "npx",
        args: [
          "-y",
          "mcp-remote@latest",
          `${env.base_url}/mcp`,
          "--transport",
          "http-only",
          "--auth-timeout",
          "120",
        ],
        env: {},
      },
    },
  };
}

function print_banner(env, options) {
  const transport_labels = {
    http: "streamable-http (hosted MCP + browser OAuth)",
    remote: "mcp-remote (hosted MCP + Node.js OAuth bridge)",
    stdio: "stdio (local ri-agent MCP server)",
  };
  const transport_label = transport_labels[options.transport] || transport_labels.stdio;
  const mcp_endpoint = options.transport === "http" || options.transport === "remote"
    ? `${env.base_url}/mcp`
    : "local stdio process";

  console.log("");
  console.log("MCP Inspector - Realinsight Agent Toolkit");
  console.log("");
  console.log(`  Environment:  ${env.code}`);
  console.log(`  Base URL:     ${env.base_url}`);
  console.log(`  Transport:    ${transport_label}`);
  console.log(`  MCP endpoint: ${mcp_endpoint}`);
  console.log(`  Profile:      ${env.profile}`);

  if (options.transport === "stdio") {
    console.log(`  Credentials:  ${env.config_path}`);
  }

  console.log("");
  console.log(`Inspector config written to ${path.relative(REPO_ROOT, CONFIG_FILE)}`);
  console.log(`Inspector UI: http://localhost:${options.port}`);
  console.log("");

  if (options.transport === "http") {
    console.log("Click \"Connect\" in the inspector UI to start the OAuth flow.");
    console.log("The inspector discovers OAuth metadata from the MCP endpoint and");
    console.log("opens a browser for the Realinsight login/SSO/MFA authorization.");
    console.log("");
    console.log("NOTE: The browser OAuth callback may fail if the Realinsight server");
    console.log("does not send CORS headers on OAuth endpoints. If you see");
    console.log("\"Cannot Connect\" after the OAuth redirect, use --transport remote");
    console.log("instead, which handles OAuth in Node.js and avoids CORS entirely.");
    console.log("");
  }
  else if (options.transport === "remote") {
    console.log("Click \"Connect\" in the inspector UI. The mcp-remote bridge will");
    console.log("open a browser for the Realinsight OAuth login/SSO/MFA flow.");
    console.log("OAuth happens in Node.js, so no CORS issues.");
    console.log("");
  }
  else {
    const login_env = `REALINSIGHT_AGENT_CONFIG="${env.config_path}"`;
    const login_cmd = `npm run ri-agent -- auth login --base-url ${env.base_url} --profile ${env.profile}`;
    console.log("For stdio transport, authenticate first if you haven't already:");
    console.log("");
    console.log(`  ${login_env} ${login_cmd}`);
    console.log("");
    console.log("Then use the auth_status tool in the inspector to verify the connection.");
    console.log("");
  }

  console.log("Launching MCP Inspector...");
  console.log("");
}

async function launch_inspector(env, options, extra_args) {
  const port = options.port;
  const session_token = randomBytes(32).toString("hex");
  const child_env = {
    ...process.env,
    CLIENT_PORT: String(port),
    MCP_PROXY_AUTH_TOKEN: session_token,
    MCP_AUTO_OPEN_ENABLED: "false",
  };

  const inspector_args = [
    "--config", CONFIG_FILE,
    "--server", env.server_name,
    ...extra_args,
  ];

  const local_bin = path.join(REPO_ROOT, "node_modules", ".bin", "mcp-inspector");
  const has_local = await file_exists(local_bin);

  let command;
  let args;

  if (has_local) {
    command = local_bin;
    args = inspector_args;
  }
  else {
    command = "npx";
    args = ["-y", "@modelcontextprotocol/inspector", ...inspector_args];
  }

  const child = spawn(command, args, {
    stdio: "inherit",
    env: child_env,
  });

  child.on("error", (error) => {
    console.error(`Failed to launch MCP Inspector: ${error.message}`);
    if (!has_local) {
      console.error("Try installing it locally: npm install");
    }
    console.error("The MCP Inspector requires Node.js >= 22.7.5.");
    process.exitCode = 1;
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.exitCode = 130;
      return;
    }
    process.exitCode = code ?? 1;
  });

  await sleep(3000);
  open_browser_with_config(env, options, port, session_token);
}

function build_browser_url(env, options, port, session_token) {
  const base = `http://localhost:${port}`;
  const params = new URLSearchParams();

  params.set("MCP_PROXY_AUTH_TOKEN", session_token);

  if (options.transport === "http") {
    params.set("transport", "streamable-http");
    params.set("serverUrl", `${env.base_url}/mcp`);
  }
  else if (options.transport === "remote") {
    const remote_args = [
      "-y", "mcp-remote@latest",
      `${env.base_url}/mcp`,
      "--transport", "http-only",
      "--auth-timeout", "120",
    ];
    params.set("transport", "stdio");
    params.set("serverCommand", "npx");
    params.set("serverArgs", remote_args.join(" "));
  }
  else {
    params.set("transport", "stdio");
    params.set("serverCommand", "node");
    params.set("serverArgs", `${RI_AGENT} mcp`);
  }

  return `${base}/?${params.toString()}`;
}

function open_browser_with_config(env, options, port, session_token) {
  const url = build_browser_url(env, options, port, session_token);
  console.log(`Opening inspector with pre-configured transport and server...`);
  console.log(`  ${url}`);
  console.log("");

  const command = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "cmd"
      : "xdg-open";
  const browser_args = process.platform === "win32"
    ? ["/c", "start", "", url]
    : [url];

  try {
    const browser = spawn(command, browser_args, {
      detached: true,
      stdio: "ignore",
    });
    browser.unref();
  }
  catch {
    console.log(`Could not open browser automatically. Open this URL:`);
    console.log(`  ${url}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function file_exists(file) {
  try {
    await fs.access(file);
    return true;
  }
  catch {
    return false;
  }
}

function print_help() {
  const env_lines = Object.values(ENV_DEFAULTS)
    .map((env) => `  ${env.code.padEnd(11)} ${normalize_base_url(env.base_url)}`)
    .join("\n");

  console.log(`MCP Inspector - Realinsight Agent Toolkit

Launch the MCP Inspector (@modelcontextprotocol/inspector) against the
Realinsight MCP server for a selected environment and transport.

Usage:
  npm run inspect:mcp -- [options]
  node ./tools/mcp-inspector.mjs [options]

Options:
  --env prod|dev|qa|localhost  Target environment. Defaults to dev.
  --transport stdio|http|remote  MCP transport. Defaults to stdio.
                               stdio:  local ri-agent MCP server (needs prior auth login).
                               http:   hosted Streamable HTTP MCP (browser OAuth, may hit CORS).
                               remote: mcp-remote bridge to hosted MCP (Node.js OAuth, no CORS).
  --port PORT                  Inspector UI port. Defaults to 6274.
  --                           Pass remaining args to the inspector.
  --help, -h                   Show this help.

Environments:
${env_lines}

  Override base URLs with RI_AGENT_DEV_BASE_URL, RI_AGENT_QA_BASE_URL,
  or RI_AGENT_LOCALHOST_BASE_URL environment variables.

Examples:
  npm run inspect:mcp                                     dev, stdio (default)
  npm run inspect:mcp:dev                                 dev, stdio
  npm run inspect:mcp:qa                                  qa, stdio
  npm run inspect:mcp:prod                                prod, stdio
  npm run inspect:mcp:localhost                           localhost, stdio
  npm run inspect:mcp:remote                              dev, mcp-remote (recommended for OAuth)
  npm run inspect:mcp -- --transport remote               dev, mcp-remote
  npm run inspect:mcp -- --env qa --transport remote      qa, mcp-remote
  npm run inspect:mcp -- --env prod --transport remote    prod, mcp-remote
  npm run inspect:mcp:http                                dev, hosted HTTP (browser OAuth)
  npm run inspect:mcp -- --transport http                 dev, hosted HTTP (browser OAuth)

Transports:

  stdio:
    Launches the local ri-agent MCP server. Requires prior CLI auth login:
      REALINSIGHT_AGENT_CONFIG=~/.realinsight/agent-toolkit-dev.json \\
        npm run ri-agent -- auth login --base-url https://www.ri2-dev.com/api/v1 --profile realinsight-dev
    Then use auth_status in the inspector to verify the connection.

  remote (recommended for OAuth testing):
    Launches mcp-remote as a stdio bridge to the hosted MCP endpoint.
    OAuth happens in Node.js (no browser CORS issues).
    Click "Connect" in the inspector, then complete the browser login
    that mcp-remote opens. The inspector sees the full MCP protocol.

  http:
    Connects directly to the hosted Streamable HTTP MCP endpoint.
    The inspector's browser-based OAuth flow may fail if the Realinsight
    server does not send CORS headers on OAuth endpoints. Use --transport
    remote instead if you encounter "Cannot Connect" after OAuth redirect.

Requirements:
  Node.js >= 22.7.5 (for @modelcontextprotocol/inspector)
  Run "npm install" to install the inspector locally and avoid npx cache issues.
`);
}
