#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DEST = ".tmp/dist";
const DEFAULT_ENVS = ["prod", "dev", "qa", "localhost"];
const DEFAULT_RUNTIMES = ["node", "http"];
const CONNECTOR_BASE_NAME = "realinsight-connector";
const MAX_TOOL_RESULT_BYTES = "240000";

const ENV_DEFAULTS = {
  prod: {
    code: "prod",
    suffix: "",
    display_name: "Realinsight Connector",
    base_url: "https://www.realinsight.cloud/api/v1",
    profile: "realinsight-prod",
  },
  dev: {
    code: "dev",
    suffix: "dev",
    display_name: "Realinsight Connector Dev",
    base_url: process.env.RI_AGENT_DEV_BASE_URL || "https://www.ri2-dev.com/api/v1",
    profile: "realinsight-dev",
  },
  qa: {
    code: "qa",
    suffix: "qa",
    display_name: "Realinsight Connector QA",
    base_url: process.env.RI_AGENT_QA_BASE_URL || "https://www.ri2-qa.com/api/v1",
    profile: "realinsight-qa",
  },
  localhost: {
    code: "localhost",
    suffix: "localhost",
    display_name: "Realinsight Connector Localhost",
    base_url: process.env.RI_AGENT_LOCALHOST_BASE_URL || "http://localhost:7000",
    profile: "realinsight-localhost",
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

  const dest_root = path.resolve(REPO_ROOT, options.dest);
  await reset_dir(dest_root);

  const envs = options.envs.map((env_code) => resolve_env(env_code, options));
  const metadata = await read_source_metadata();

  await render_plugin_bundles({ envs, options, metadata });
  await render_host_packages({ envs, options, metadata, dest_root });
  await write_dist_readme({ envs, options, metadata, dest_root });

  console.log("Built distribution packages:");
  console.log(`- ${path.relative(REPO_ROOT, dest_root)}`);
}

function parse_args(argv) {
  const options = {
    envs: DEFAULT_ENVS,
    runtimes: DEFAULT_RUNTIMES,
    dest: DEFAULT_DEST,
    base_urls: {},
    build_id: default_build_id(),
    pack_mcpb: true,
    mcpb_packer: "auto",
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [name, inline_value] = arg.includes("=") ? arg.split(/=(.*)/s, 2) : [arg, null];
    const take = () => {
      if (inline_value !== null) return inline_value;
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };

    switch (name) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--env":
      case "--envs":
        options.envs = split_list(take()).map(normalize_env_code);
        break;
      case "--runtime":
      case "--runtimes":
        options.runtimes = split_list(take()).map(normalize_runtime);
        break;
      case "--node":
        options.runtimes = ["node"];
        break;
      case "--http":
        options.runtimes = ["http"];
        break;
      case "--dest":
        options.dest = take();
        break;
      case "--build-id":
        options.build_id = sanitize_build_id(take());
        break;
      case "--base-url":
        parse_base_url_override(take(), options);
        break;
      case "--dev-base-url":
        options.base_urls.dev = take();
        break;
      case "--qa-base-url":
        options.base_urls.qa = take();
        break;
      case "--prod-base-url":
        options.base_urls.prod = take();
        break;
      case "--localhost-base-url":
        options.base_urls.localhost = take();
        break;
      case "--pack-mcpb":
        options.pack_mcpb = true;
        break;
      case "--no-pack-mcpb":
        options.pack_mcpb = false;
        break;
      case "--mcpb-packer":
        options.mcpb_packer = take();
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  options.envs = unique(options.envs);
  options.runtimes = unique(options.runtimes);
  return options;
}

function print_help() {
  console.log(`Usage:
  npm run build:dist -- [options]

Options:
  --env prod,dev,qa,localhost  Environments to build. Defaults to all.
  --runtime node,http          Transports to build. Defaults to node,http. Also supports mcp-remote.
  --node                       Shortcut for --runtime node.
  --http                       Shortcut for --runtime http.
  --dest .tmp/dist             Output folder. Defaults to .tmp/dist.
  --build-id ID                Non-prod plugin version suffix. Defaults to a UTC timestamp.
  --dev-base-url URL           Override development API base URL.
  --qa-base-url URL            Override QA API base URL.
  --prod-base-url URL          Override production API base URL.
  --localhost-base-url URL     Override localhost API base URL.
  --base-url env=URL           Generic base URL override. Can be repeated.
  --pack-mcpb                  Pack Claude Desktop MCPB files when possible. Default.
  --no-pack-mcpb               Render MCPB source zips only.
  --mcpb-packer auto|local|npx Passed through to tools/package-env-bundles.mjs.

Examples:
  npm run build:dist:dev
  npm run build:dist:localhost
  npm run build:dist -- --env dev --runtime node,http,mcp-remote
  npm run build:dist -- --env localhost --localhost-base-url http://localhost:7000
`);
}

async function read_source_metadata() {
  const codex_manifest = await read_json(path.join(REPO_ROOT, "plugins/codex/realinsight-connector/.codex-plugin/plugin.json"));
  const claude_manifest = await read_json(path.join(REPO_ROOT, "plugins/claude/realinsight-connector/.claude-plugin/plugin.json"));
  const mcpb_manifest = await read_json(path.join(REPO_ROOT, "extensions/claude-desktop/realinsight-connector/manifest.json"));
  const package_json = await read_json(path.join(REPO_ROOT, "packages/agent-toolkit/package.json"));
  const release_manifest = await read_json(path.join(REPO_ROOT, "RELEASE_MANIFEST.json"));

  return {
    codex_manifest,
    claude_manifest,
    mcpb_manifest,
    package_json,
    release_manifest,
    version: package_json.version || codex_manifest.version || claude_manifest.version || "0.2.2",
    description: host_neutral_description(codex_manifest, claude_manifest, package_json),
  };
}

function host_neutral_description(codex_manifest, claude_manifest, package_json) {
  const long_description = codex_manifest.interface?.longDescription || "";
  const supported = long_description.match(/This connector supports .+$/s)?.[0];
  return supported || package_json.description || codex_manifest.description || claude_manifest.description;
}

async function render_plugin_bundles({ envs, options }) {
  const package_script = path.join(REPO_ROOT, "tools/package-env-bundles.mjs");

  if (options.runtimes.includes("node")) {
    run_node(package_script, [
      "--env", envs.map((env) => env.code).join(","),
      "--runtime", "node",
      "--type", "all",
      "--dest", options.dest,
      "--build-id", options.build_id,
      ...base_url_args(options),
      ...(options.pack_mcpb ? ["--pack-mcpb", "--mcpb-packer", options.mcpb_packer] : []),
    ]);
  }

  if (options.runtimes.includes("http")) {
    run_node(package_script, [
      "--env", envs.map((env) => env.code).join(","),
      "--runtime", "http",
      "--type", "codex,claude-plugin",
      "--dest", options.dest,
      "--build-id", options.build_id,
      ...base_url_args(options),
    ]);
  }

  if (options.runtimes.includes("mcp-remote")) {
    run_node(package_script, [
      "--env", envs.map((env) => env.code).join(","),
      "--runtime", "mcp-remote",
      "--type", "claude-plugin",
      "--dest", options.dest,
      "--build-id", options.build_id,
      ...base_url_args(options),
    ]);
  }
}

function run_node(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${path.relative(REPO_ROOT, script)} failed with exit code ${result.status}`);
  }
}

async function render_host_packages({ envs, options, metadata, dest_root }) {
  for (const env of envs) {
    for (const runtime of options.runtimes) {
      const runtime_root = path.join(dest_root, env.code, runtime);
      await write_runtime_readme(runtime_root, env, runtime, metadata);

      if (runtime === "node") {
        await render_node_host_package(runtime_root, "claude-desktop", env, metadata);
        await render_node_host_package(runtime_root, "cursor", env, metadata);
        await render_node_host_package(runtime_root, "generic-mcp", env, metadata);
      }
      else if (runtime === "http") {
        await render_http_host_package(runtime_root, "claude-web", env, metadata);
        await render_http_host_package(runtime_root, "chatgpt", env, metadata);
        await render_http_host_package(runtime_root, "cursor", env, metadata);
        await render_http_host_package(runtime_root, "generic-mcp", env, metadata);
      }
      else if (runtime === "mcp-remote") {
        await render_mcp_remote_host_package(runtime_root, "claude-desktop", env, metadata);
        await render_mcp_remote_host_package(runtime_root, "cursor", env, metadata);
        await render_mcp_remote_host_package(runtime_root, "generic-mcp", env, metadata);
      }
      else {
        throw new Error(`Unsupported runtime for dist host packages: ${runtime}`);
      }
    }
  }
}

async function render_node_host_package(runtime_root, host, env, metadata) {
  const package_root = path.join(runtime_root, "host-packages", host);
  const zip_path = path.join(runtime_root, "host-packages", `${env.plugin_name}-${host}-node.zip`);

  await reset_dir(package_root);
  await copy_dir(path.join(REPO_ROOT, "packages/agent-toolkit/src"), path.join(package_root, "src"));
  await copy_dir(path.join(REPO_ROOT, "skills/realinsight-agent-toolkit"), path.join(package_root, "skills/realinsight-agent-toolkit"));

  await write_json(path.join(package_root, "mcp.stdio.template.json"), build_stdio_mcp_template(env));
  await write_json(path.join(package_root, "claude_desktop_config.fragment.json"), {
    mcpServers: build_stdio_mcp_template(env).mcpServers,
  });
  await write_json(path.join(package_root, ".cursor/mcp.json"), build_stdio_mcp_template(env));
  await fs.writeFile(path.join(package_root, "README.md"), build_host_readme(host, env, "node", metadata));
  await fs.writeFile(path.join(package_root, "INSTALL_WITH_AGENT.md"), build_agent_install_prompt(host, env, "node"));
  await zip_directory(path.join(package_root, "skills"), path.join(package_root, "realinsight-agent-toolkit-skill.zip"));
  await zip_directory(package_root, zip_path);
}

async function render_http_host_package(runtime_root, host, env, metadata) {
  const package_root = path.join(runtime_root, "host-packages", host);
  const zip_path = path.join(runtime_root, "host-packages", `${env.plugin_name}-${host}-http.zip`);

  await reset_dir(package_root);
  await copy_dir(path.join(REPO_ROOT, "skills/realinsight-agent-toolkit"), path.join(package_root, "skills/realinsight-agent-toolkit"));

  await write_json(path.join(package_root, "mcp.http.json"), build_http_mcp_template(env));
  await write_json(path.join(package_root, ".cursor/mcp.json"), build_http_mcp_template(env));
  await fs.writeFile(path.join(package_root, "README.md"), build_host_readme(host, env, "http", metadata));
  await fs.writeFile(path.join(package_root, "INSTALL_WITH_AGENT.md"), build_agent_install_prompt(host, env, "http"));
  await zip_directory(path.join(package_root, "skills"), path.join(package_root, "realinsight-agent-toolkit-skill.zip"));
  await zip_directory(package_root, zip_path);
}

async function render_mcp_remote_host_package(runtime_root, host, env, metadata) {
  const package_root = path.join(runtime_root, "host-packages", host);
  const zip_path = path.join(runtime_root, "host-packages", `${env.plugin_name}-${host}-mcp-remote.zip`);

  await reset_dir(package_root);
  await copy_dir(path.join(REPO_ROOT, "skills/realinsight-agent-toolkit"), path.join(package_root, "skills/realinsight-agent-toolkit"));

  await write_json(path.join(package_root, "mcp.remote-stdio.json"), build_mcp_remote_template(env));
  await write_json(path.join(package_root, "claude_desktop_config.fragment.json"), {
    mcpServers: build_mcp_remote_template(env).mcpServers,
  });
  await write_json(path.join(package_root, ".cursor/mcp.json"), build_mcp_remote_template(env));
  await fs.writeFile(path.join(package_root, "README.md"), build_host_readme(host, env, "mcp-remote", metadata));
  await fs.writeFile(path.join(package_root, "INSTALL_WITH_AGENT.md"), build_agent_install_prompt(host, env, "mcp-remote"));
  await zip_directory(path.join(package_root, "skills"), path.join(package_root, "realinsight-agent-toolkit-skill.zip"));
  await zip_directory(package_root, zip_path);
}

function build_stdio_mcp_template(env) {
  return {
    mcpServers: {
      [env.server_name]: {
        type: "stdio",
        command: "node",
        args: [
          "<EXTRACTED_PACKAGE_DIR>/src/ri-agent.mjs",
          "mcp",
        ],
        env: build_mcp_env(env),
      },
    },
  };
}

function build_mcp_remote_template(env) {
  return {
    mcpServers: {
      [env.server_name]: {
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
      },
    },
  };
}

function build_http_mcp_template(env) {
  return {
    mcpServers: {
      [env.server_name]: {
        type: "http",
        url: `${env.base_url}/mcp`,
      },
    },
  };
}

function build_mcp_env(env) {
  return {
    RI_AGENT_BASE_URL: env.base_url,
    RI_AGENT_PROFILE: env.profile,
    RI_AGENT_MAX_TOOL_RESULT_BYTES: MAX_TOOL_RESULT_BYTES,
  };
}

function build_host_readme(host, env, runtime, metadata) {
  const host_title = host_label(host);
  const plugin_name = env.plugin_name;
  const transport = {
    node: "local stdio MCP with the bundled Node runtime",
    http: "hosted Streamable HTTP MCP",
    "mcp-remote": "hosted Streamable HTTP MCP bridged through local stdio by `mcp-remote`",
  }[runtime];
  const package_note = {
    node: "This package contains the local `ri-agent` runtime, MCP config templates, and the Realinsight skill.",
    http: "This package contains MCP config templates, agent-facing setup instructions, and the Realinsight skill. The MCP server itself is hosted.",
    "mcp-remote": "This package contains MCP config templates, agent-facing setup instructions, and the Realinsight skill. The MCP server itself is hosted; `mcp-remote` runs locally through `npx` as a stdio bridge.",
  }[runtime];
  const mcp_file = {
    node: "mcp.stdio.template.json",
    http: "mcp.http.json",
    "mcp-remote": "mcp.remote-stdio.json",
  }[runtime];

  return `# ${env.display_name} For ${host_title}

${metadata.description}

Environment: \`${env.code}\`
Base URL: \`${env.base_url}\`
MCP endpoint: \`${runtime === "http" || runtime === "mcp-remote" ? `${env.base_url}/mcp` : "local stdio"}\`
Profile: \`${env.profile}\`
Transport: ${transport}

${package_note}

## Files

- \`INSTALL_WITH_AGENT.md\`: prompt/instructions to give to an agent that can edit your local app config.
- \`${mcp_file}\`: host-neutral MCP config template.
- \`.cursor/mcp.json\`: Cursor-ready template.
- \`skills/realinsight-agent-toolkit/\`: Realinsight skill source for hosts that support local skills.
- \`realinsight-agent-toolkit-skill.zip\`: skill-only upload/archive for hosts that need one.

For Codex and Claude Code, prefer the first-class plugin bundles in sibling \`codex/\` and \`claude-plugin/\` folders when available.
`;
}

function build_agent_install_prompt(host, env, runtime) {
  const host_title = host_label(host);

  if (runtime === "node") {
    return `# Agent Install Prompt: ${env.display_name} For ${host_title}

I have a Realinsight Agent Toolkit package extracted locally.

Configure ${host_title} to use this local stdio MCP server:

\`\`\`json
${JSON.stringify(build_stdio_mcp_template(env).mcpServers[env.server_name], null, 2)}
\`\`\`

Replace \`<EXTRACTED_PACKAGE_DIR>\` with the absolute path to this extracted package folder.

Also install or reference the Realinsight skill from:

\`\`\`text
<EXTRACTED_PACKAGE_DIR>/skills/realinsight-agent-toolkit
\`\`\`

After setup, verify the MCP server can start and run the Realinsight \`auth_status\` tool. If it is not authenticated, use the \`connect_realinsight\` MCP tool or run:

\`\`\`bash
node "<EXTRACTED_PACKAGE_DIR>/src/ri-agent.mjs" auth login --base-url ${env.base_url} --profile ${env.profile}
\`\`\`

Use the ${env.code} environment only for approved testing.
`;
  }

  if (runtime === "mcp-remote") {
    return `# Agent Install Prompt: ${env.display_name} For ${host_title}

Configure ${host_title} to use the hosted Realinsight Streamable HTTP MCP endpoint through \`mcp-remote\`:

\`\`\`json
${JSON.stringify(build_mcp_remote_template(env).mcpServers[env.server_name], null, 2)}
\`\`\`

This starts a local stdio bridge with \`npx mcp-remote@latest\` and connects it to:

\`\`\`text
${env.base_url}/mcp
\`\`\`

If ${host_title} supports local or project skills, install or reference the Realinsight skill from this package:

\`\`\`text
skills/realinsight-agent-toolkit
\`\`\`

After setup, restart ${host_title}, complete the browser OAuth flow started by \`mcp-remote\`, and verify the Realinsight \`auth_status\` tool.

Use the ${env.code} environment only for approved testing.
`;
  }

  return `# Agent Install Prompt: ${env.display_name} For ${host_title}

Configure ${host_title} to use the hosted Realinsight Streamable HTTP MCP endpoint:

\`\`\`json
${JSON.stringify(build_http_mcp_template(env).mcpServers[env.server_name], null, 2)}
\`\`\`

If ${host_title} supports local or project skills, install or reference the Realinsight skill from this package:

\`\`\`text
skills/realinsight-agent-toolkit
\`\`\`

After setup, connect through the host application's OAuth or connector flow and verify the Realinsight \`auth_status\` tool.

Use the ${env.code} environment only for approved testing.
`;
}

async function write_runtime_readme(runtime_root, env, runtime, metadata) {
  await fs.mkdir(runtime_root, { recursive: true });
  const mcp_endpoint = runtime === "http" || runtime === "mcp-remote" ? `${env.base_url}/mcp` : "local stdio";
  const bundle_lines = runtime === "mcp-remote"
    ? [
      "This runtime packages `mcp-remote` config for hosts that need a local stdio MCP process while still using the hosted Realinsight MCP server.",
      "",
    ]
    : [
      "## First-Class Bundles",
      "",
      "- `codex/`: Codex marketplace/plugin bundle.",
      "- `claude-plugin/`: Claude Code plugin/marketplace bundle.",
      "- `claude-mcpb/`: Claude Desktop MCPB source and packed extension. Node runtime only.",
      "",
    ];
  await fs.writeFile(path.join(runtime_root, "README.md"), `# ${env.display_name} ${runtime} Distribution

Version: \`${metadata.version}\`
Environment: \`${env.code}\`
Base URL: \`${env.base_url}\`
MCP endpoint: \`${mcp_endpoint}\`

${bundle_lines.join("\n")}

## Host Packages

- \`host-packages/claude-desktop/\`: manual Claude Desktop config templates and skill archive.
- \`host-packages/cursor/\`: Cursor MCP config template and skill archive.
- \`host-packages/claude-web/\`: hosted Claude connector instructions. HTTP runtime only.
- \`host-packages/chatgpt/\`: hosted ChatGPT connector instructions. HTTP runtime only.
- \`host-packages/generic-mcp/\`: host-neutral MCP config templates.

Not every host supports a single upload that installs both MCP and skills. Use \`INSTALL_WITH_AGENT.md\` in each host package when the host needs manual setup.
`);
}

async function write_dist_readme({ envs, options, metadata, dest_root }) {
  const lines = [
    "# Realinsight Agent Toolkit Distribution",
    "",
    `Version: \`${metadata.version}\``,
    `Generated from release manifest source commit: \`${metadata.release_manifest.source_commit || "unknown"}\``,
    "",
    "These files are generated for distribution and are intentionally ignored by git.",
    "",
    "## Environments",
    "",
    "| Environment | Base URL | Profile |",
    "| --- | --- | --- |",
    ...envs.map((env) => `| ${env.code} | \`${env.base_url}\` | \`${env.profile}\` |`),
    "",
    "## Package Map",
    "",
    "- Codex: use `codex/` marketplace folders or `*-codex-*.zip` archives.",
    "- Claude Code: use `claude-plugin/` marketplace folders or `*-claude-plugin-upload-*.zip` archives.",
    "- Claude Desktop local stdio: use `node/claude-mcpb/` or the manual `node/host-packages/claude-desktop/` package.",
    "- Claude web and ChatGPT hosted connectors: use HTTP host packages as install instructions plus the hosted MCP URL.",
    "- Cursor and generic MCP hosts: use the host package matching the desired runtime.",
    "- `mcp-remote`: use when a host works better with local stdio processes than native hosted HTTP OAuth.",
    "",
    "## Agent Setup Pattern",
    "",
    "For hosts that do not have a marketplace/plugin import, give the target agent the host package's `INSTALL_WITH_AGENT.md`. It includes the MCP transport, environment, profile, and skill path to install or reference.",
    "",
    "## Build Inputs",
    "",
    `Runtimes: \`${options.runtimes.join(",")}\``,
    `MCPB packed: \`${options.pack_mcpb ? "yes" : "no"}\``,
    `Build id: \`${options.build_id}\``,
    "",
  ];

  await fs.writeFile(path.join(dest_root, "README.md"), `${lines.join("\n")}\n`);
}

function resolve_env(env_code, options) {
  const defaults = ENV_DEFAULTS[env_code];
  if (!defaults) throw new Error(`Unsupported environment ${env_code}. Use prod, dev, qa, or localhost.`);
  const base_url = normalize_base_url(options.base_urls[env_code] || defaults.base_url);
  return {
    ...defaults,
    base_url,
    plugin_name: defaults.suffix ? `${CONNECTOR_BASE_NAME}-${defaults.suffix}` : CONNECTOR_BASE_NAME,
    server_name: defaults.suffix ? `realinsight-agent-toolkit-${defaults.suffix}` : "realinsight-agent-toolkit",
  };
}

function split_list(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

function normalize_env_code(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "production") return "prod";
  if (normalized === "development") return "dev";
  return normalized;
}

function normalize_runtime(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!["node", "http", "mcp-remote"].includes(normalized)) {
    throw new Error(`Unsupported runtime ${value}. Use node, http, or mcp-remote.`);
  }
  return normalized;
}

function default_build_id() {
  return new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
}

function sanitize_build_id(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-z-]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "");
}

function normalize_base_url(value) {
  return String(value || "").replace(/\/+$/g, "");
}

function parse_base_url_override(value, options) {
  const match = String(value).match(/^([^=]+)=(.+)$/);
  if (!match) throw new Error("--base-url must be in env=url form, for example --base-url qa=https://qa.example/api/v1");
  options.base_urls[normalize_env_code(match[1])] = match[2];
}

function base_url_args(options) {
  return Object.entries(options.base_urls).flatMap(([env, url]) => ["--base-url", `${env}=${url}`]);
}

function host_label(host) {
  return {
    "claude-desktop": "Claude Desktop",
    "claude-web": "Claude Web",
    "chatgpt": "ChatGPT",
    "claude-code": "Claude Code",
    "generic-mcp": "Generic MCP Host",
    "cursor": "Cursor",
  }[host] || host;
}

async function reset_dir(dir) {
  await assert_safe_output_dir(dir);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function assert_safe_output_dir(dir) {
  const relative = path.relative(REPO_ROOT, path.resolve(dir));
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to reset output directory outside this repo: ${dir}`);
  }
}

async function copy_dir(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.cp(src, dest, {
    recursive: true,
    filter: should_copy_entry,
  });
}

function should_copy_entry(entry) {
  const name = path.basename(entry);
  if (name === ".DS_Store") return false;
  if (name === "node_modules") return false;
  if (name === ".npm-cache") return false;
  if (name.endsWith(".mcpb")) return false;
  if (name.endsWith(".zip")) return false;
  if (name.endsWith(".tgz")) return false;
  return true;
}

async function read_json(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function write_json(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function zip_directory(source_dir, zip_path) {
  const entries = await list_files(source_dir);
  const chunks = [];
  const central = [];
  let offset = 0;

  for (const file of entries) {
    const abs_path = path.join(source_dir, file);
    const data = await fs.readFile(abs_path);
    const compressed = deflateRawSync(data);
    const crc = crc32(data);
    const name = Buffer.from(to_posix(file));
    const { time, date } = dos_datetime((await fs.stat(abs_path)).mtime);
    const local = Buffer.alloc(30);

    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, name, compressed);
    central.push({
      name,
      crc,
      compressed_size: compressed.length,
      uncompressed_size: data.length,
      time,
      date,
      offset,
    });

    offset += local.length + name.length + compressed.length;
  }

  const central_start = offset;

  for (const entry of central) {
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(8, 10);
    header.writeUInt16LE(entry.time, 12);
    header.writeUInt16LE(entry.date, 14);
    header.writeUInt32LE(entry.crc, 16);
    header.writeUInt32LE(entry.compressed_size, 20);
    header.writeUInt32LE(entry.uncompressed_size, 24);
    header.writeUInt16LE(entry.name.length, 28);
    header.writeUInt16LE(0, 30);
    header.writeUInt16LE(0, 32);
    header.writeUInt16LE(0, 34);
    header.writeUInt16LE(0, 36);
    header.writeUInt32LE(0, 38);
    header.writeUInt32LE(entry.offset, 42);

    chunks.push(header, entry.name);
    offset += header.length + entry.name.length;
  }

  const central_size = offset - central_start;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(central.length, 8);
  end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(central_size, 12);
  end.writeUInt32LE(central_start, 16);
  end.writeUInt16LE(0, 20);

  chunks.push(end);
  await fs.mkdir(path.dirname(zip_path), { recursive: true });
  await fs.writeFile(zip_path, Buffer.concat(chunks));
}

async function list_files(root) {
  const files = [];

  async function visit(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      if (entry.name === ".DS_Store") continue;
      if (!should_zip_entry(path.join(dir, entry.name))) continue;
      const abs_path = path.join(dir, entry.name);
      const rel_path = path.relative(root, abs_path);

      if (entry.isDirectory()) {
        await visit(abs_path);
      }
      else if (entry.isFile()) {
        files.push(rel_path);
      }
    }
  }

  await visit(root);
  return files;
}

function to_posix(value) {
  return value.split(path.sep).join("/");
}

function should_zip_entry(entry) {
  const name = path.basename(entry);
  if (name === ".DS_Store") return false;
  if (name === "node_modules") return false;
  if (name === ".npm-cache") return false;
  if (name.endsWith(".tgz")) return false;
  return true;
}

function dos_datetime(date) {
  const year = Math.max(1980, date.getFullYear());
  const dos_date = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const dos_time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  return { date: dos_date, time: dos_time };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
