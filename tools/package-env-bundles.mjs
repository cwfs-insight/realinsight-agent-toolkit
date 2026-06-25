#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateRawSync } from "node:zlib";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_DEST = ".tmp/plugin-packages";
const CONNECTOR_BASE_NAME = "realinsight-connector";
const MAX_TOOL_RESULT_BYTES = "240000";
const ALL_TYPES = ["codex", "claude-plugin", "claude-mcpb"];
const DEFAULT_TYPES = ["codex", "claude-plugin"];
const DEFAULT_RUNTIMES = ["node"];
const DEFAULT_ENVS = ["dev"];

const ENV_DEFAULTS = {
  prod: {
    code: "prod",
    suffix: "",
    display_suffix: "",
    display_name: "Realinsight Connector",
    marketplace_name: "realinsight",
    marketplace_display: "Realinsight",
    base_url: "https://www.realinsight.cloud/api/v1",
    profile: "realinsight-prod",
  },
  dev: {
    code: "dev",
    suffix: "dev",
    display_suffix: "Dev",
    display_name: "Realinsight Connector Dev",
    marketplace_name: "realinsight-dev",
    marketplace_display: "Realinsight Dev",
    base_url: process.env.RI_AGENT_DEV_BASE_URL || "https://www.ri2-dev.com/api/v1",
    profile: "realinsight-dev",
  },
  localhost: {
    code: "localhost",
    suffix: "localhost",
    display_suffix: "Localhost",
    display_name: "Realinsight Connector Localhost",
    marketplace_name: "realinsight-localhost",
    marketplace_display: "Realinsight Localhost",
    base_url: process.env.RI_AGENT_LOCALHOST_BASE_URL || "http://localhost:7000",
    profile: "realinsight-localhost",
  },
  qa: {
    code: "qa",
    suffix: "qa",
    display_suffix: "QA",
    display_name: "Realinsight Connector QA",
    marketplace_name: "realinsight-qa",
    marketplace_display: "Realinsight QA",
    base_url: process.env.RI_AGENT_QA_BASE_URL || "https://www.ri2-qa.com/api/v1",
    profile: "realinsight-qa",
  },
};

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});

async function main() {
  const options = await parse_args(process.argv.slice(2));

  if (options.help) {
    print_help();
    return;
  }

  const envs = options.envs.map((env_code) => resolve_env(env_code, options));
  const package_version = options.package_version || await read_package_version();
  const dest_root = path.resolve(REPO_ROOT, options.dest);
  const artifacts = [];

  for (const env of envs) {
    for (const runtime of options.runtimes) {
      for (const type of options.types) {
        if (type === "codex") {
          artifacts.push(...await render_codex_bundle({ env, runtime, package_version, dest_root, options }));
        }
        else if (type === "claude-plugin") {
          artifacts.push(...await render_claude_plugin_bundle({ env, runtime, package_version, dest_root, options }));
        }
        else if (type === "claude-mcpb") {
          artifacts.push(...await render_claude_mcpb_bundle({ env, runtime, package_version, dest_root, options }));
        }
        else {
          throw new Error(`Unsupported type: ${type}`);
        }
      }
    }
  }

  console.log("Packaged environment bundles:");
  for (const artifact of artifacts) {
    console.log(`- ${artifact.label}: ${path.relative(REPO_ROOT, artifact.path)}`);
  }
}

async function parse_args(argv) {
  const options = {
    envs: DEFAULT_ENVS,
    types: DEFAULT_TYPES,
    runtimes: DEFAULT_RUNTIMES,
    dest: DEFAULT_DEST,
    base_urls: {},
    package_version: "",
    build_id: "",
    pack_mcpb: false,
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
      case "--type":
      case "--types":
        options.types = expand_types(split_list(take()));
        break;
      case "--runtime":
      case "--runtimes":
        options.runtimes = split_list(take()).map(normalize_runtime);
        break;
      case "--node":
        options.runtimes = ["node"];
        break;
      case "--dest":
        options.dest = take();
        break;
      case "--package-version":
        options.package_version = take();
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
      case "--mcpb-packer":
        options.mcpb_packer = take();
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  options.envs = unique(options.envs);
  options.types = unique(options.types);
  options.runtimes = unique(options.runtimes);

  return options;
}

function print_help() {
  console.log(`Usage:
  npm run package:plugins -- [options]

Options:
  --env prod,dev,qa,localhost  Environments to package. Defaults to dev.
  --type codex,claude-plugin   Bundle types. Use all for codex, claude-plugin, claude-mcpb.
  --runtime node,http          MCP runtime launch mode. Defaults to node. Also supports mcp-remote.
  --node                       Shortcut for --runtime node.
  --dest .tmp/plugin-packages  Output folder.
  --dev-base-url URL           Override development API base URL.
  --qa-base-url URL            Override QA API base URL.
  --prod-base-url URL          Override production API base URL.
  --localhost-base-url URL     Override localhost API base URL.
  --base-url env=URL           Generic base URL override. Can be repeated.
  --package-version VERSION    Version metadata for generated plugin manifests. Defaults to package version.
  --build-id ID                Optional non-prod plugin version suffix for refreshed test builds.
  --pack-mcpb                  Run mcpb pack for claude-mcpb bundles when available.
  --mcpb-packer auto|local|npx How to run mcpb pack. Defaults to auto.

Examples:
  npm run package:plugins:dev
  npm run package:plugins:qa
  npm run package:plugins -- --env qa --type all --runtime node
  npm run package:plugins -- --env dev --type codex,claude-plugin --runtime http
  npm run package:plugins -- --env dev --type claude-plugin --runtime mcp-remote
`);
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

function sanitize_build_id(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^0-9a-z-]+/g, ".")
    .replace(/\.+/g, ".")
    .replace(/^[.-]+|[.-]+$/g, "");
}

function expand_types(values) {
  const expanded = values.flatMap((value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "all") return ALL_TYPES;
    if (normalized === "claude") return ["claude-plugin"];
    if (normalized === "mcpb" || normalized === "claude-desktop") return ["claude-mcpb"];
    return normalized;
  });

  for (const type of expanded) {
    if (!ALL_TYPES.includes(type)) {
      throw new Error(`Unsupported type ${type}. Use ${ALL_TYPES.join(", ")}.`);
    }
  }

  return expanded;
}

function parse_base_url_override(value, options) {
  const match = String(value).match(/^([^=]+)=(.+)$/);
  if (!match) {
    throw new Error("--base-url must be in env=url form, for example --base-url qa=https://qa.example/api/v1");
  }

  options.base_urls[normalize_env_code(match[1])] = match[2];
}

function resolve_env(env_code, options) {
  const defaults = ENV_DEFAULTS[env_code];

  if (!defaults) {
    throw new Error(`Unsupported environment ${env_code}. Use dev, qa, prod, or localhost.`);
  }

  const base_url = normalize_base_url(options.base_urls[env_code] || defaults.base_url);

  if (!base_url) {
    throw new Error(
      `Missing base URL for ${env_code}. Pass --${env_code}-base-url URL or set RI_AGENT_${env_code.toUpperCase()}_BASE_URL.`,
    );
  }

  return {
    ...defaults,
    base_url,
    plugin_name: defaults.suffix ? `${CONNECTOR_BASE_NAME}-${defaults.suffix}` : CONNECTOR_BASE_NAME,
    server_name: defaults.suffix ? `realinsight-agent-toolkit-${defaults.suffix}` : "realinsight-agent-toolkit",
  };
}

function normalize_base_url(value) {
  return String(value || "").replace(/\/+$/g, "");
}

async function read_package_version() {
  const package_json = await read_json(path.join(REPO_ROOT, "packages/agent-toolkit/package.json"));
  return package_json.version || "0.2.0";
}

async function render_codex_bundle({ env, runtime, package_version, dest_root, options }) {
  const output_root = path.join(dest_root, env.code, runtime, "codex");
  const marketplace_root = path.join(output_root, "marketplace");
  const plugin_root = path.join(marketplace_root, "plugins/codex", env.plugin_name);
  const zip_path = path.join(output_root, `${env.plugin_name}-codex-${runtime}.zip`);

  await reset_dir(output_root);
  await copy_dir(path.join(REPO_ROOT, "plugins/codex/realinsight-connector"), plugin_root);

  if (runtime === "node") {
    await copy_dir(path.join(REPO_ROOT, "packages/agent-toolkit/src"), path.join(plugin_root, "src"));
  }

  await write_json(
    path.join(plugin_root, ".codex-plugin/plugin.json"),
    build_codex_plugin_manifest(await read_json(path.join(plugin_root, ".codex-plugin/plugin.json")), env, {
      build_id: options.build_id,
      runtime,
    }),
  );
  await write_json(path.join(plugin_root, ".mcp.json"), build_codex_mcp_config(env, runtime, package_version));
  await fs.writeFile(path.join(plugin_root, "README.md"), build_plugin_readme("Codex", env, runtime, package_version));
  await write_json(
    path.join(marketplace_root, ".agents/plugins/marketplace.json"),
    build_codex_marketplace(await read_json(path.join(REPO_ROOT, ".agents/plugins/marketplace.json")), env),
  );
  await fs.writeFile(path.join(marketplace_root, "README.md"), build_marketplace_readme("Codex", env, runtime));
  await zip_directory(marketplace_root, zip_path);

  return [
    { label: `${env.code} ${runtime} Codex marketplace`, path: marketplace_root },
    { label: `${env.code} ${runtime} Codex zip`, path: zip_path },
  ];
}

async function render_claude_plugin_bundle({ env, runtime, package_version, dest_root, options }) {
  const output_root = path.join(dest_root, env.code, runtime, "claude-plugin");
  const marketplace_root = path.join(output_root, "marketplace");
  const plugin_root = path.join(marketplace_root, "plugins/claude", env.plugin_name);
  const marketplace_zip_path = path.join(output_root, `${env.plugin_name}-claude-plugin-marketplace-${runtime}.zip`);
  const plugin_zip_path = path.join(output_root, `${env.plugin_name}-claude-plugin-upload-${runtime}.zip`);

  await reset_dir(output_root);
  await copy_dir(path.join(REPO_ROOT, "plugins/claude/realinsight-connector"), plugin_root);

  if (runtime === "node") {
    await copy_dir(path.join(REPO_ROOT, "packages/agent-toolkit/src"), path.join(plugin_root, "src"));
  }

  await write_json(
    path.join(plugin_root, ".claude-plugin/plugin.json"),
    build_claude_plugin_manifest(await read_json(path.join(plugin_root, ".claude-plugin/plugin.json")), env, {
      build_id: options.build_id,
    }),
  );
  await write_json(path.join(plugin_root, ".mcp.json"), build_claude_mcp_config(env, runtime, package_version));
  await fs.writeFile(path.join(plugin_root, "README.md"), build_plugin_readme("Claude", env, runtime, package_version));
  await write_json(
    path.join(marketplace_root, ".claude-plugin/marketplace.json"),
    build_claude_marketplace(await read_json(path.join(REPO_ROOT, ".claude-plugin/marketplace.json")), env, {
      build_id: options.build_id,
    }),
  );
  await fs.writeFile(path.join(marketplace_root, "README.md"), build_marketplace_readme("Claude", env, runtime));
  await zip_directory(marketplace_root, marketplace_zip_path);
  await zip_directory(plugin_root, plugin_zip_path);

  return [
    { label: `${env.code} ${runtime} Claude marketplace`, path: marketplace_root },
    { label: `${env.code} ${runtime} Claude marketplace zip`, path: marketplace_zip_path },
    { label: `${env.code} ${runtime} Claude upload zip`, path: plugin_zip_path },
  ];
}

async function render_claude_mcpb_bundle({ env, runtime, package_version, dest_root, options }) {
  if (runtime !== "node") {
    throw new Error("claude-mcpb bundles only support --runtime node because MCPB packages the local node runtime.");
  }

  const output_root = path.join(dest_root, env.code, runtime, "claude-mcpb");
  const source_root = path.join(output_root, "source");
  const source_zip_path = path.join(output_root, `${env.plugin_name}-claude-mcpb-source.zip`);
  const artifacts = [];

  await reset_dir(output_root);
  await copy_dir(path.join(REPO_ROOT, "extensions/claude-desktop/realinsight-connector"), source_root);
  await write_json(path.join(source_root, "manifest.json"), build_mcpb_manifest(await read_json(path.join(source_root, "manifest.json")), env, options));
  await write_json(path.join(source_root, "package.json"), build_mcpb_package(await read_json(path.join(source_root, "package.json")), env, options));
  await fs.writeFile(path.join(source_root, "README.md"), build_mcpb_readme(env));
  await zip_directory(source_root, source_zip_path);

  artifacts.push(
    { label: `${env.code} Claude MCPB source`, path: source_root },
    { label: `${env.code} Claude MCPB source zip`, path: source_zip_path },
  );

  if (options.pack_mcpb) {
    const packed = pack_mcpb(source_root, output_root, options.mcpb_packer);
    if (packed) artifacts.push({ label: `${env.code} Claude MCPB`, path: packed });
  }

  return artifacts;
}

function build_codex_plugin_manifest(manifest, env, build_options = {}) {
  const interface_config = manifest.interface || {};

  return {
    ...manifest,
    name: env.plugin_name,
    version: version_for_env_upload(manifest.version, env, build_options.build_id),
    interface: {
      ...interface_config,
      displayName: env.display_name,
      longDescription: codex_long_description(interface_config.longDescription, build_options.runtime),
    },
  };
}

function codex_long_description(description, runtime) {
  const fallback = "Use Realinsight from Codex with Realinsight MCP tools and bundled skills.";
  const value = description || fallback;

  if (runtime === "http") {
    return value.replace(
      "Use Realinsight from Codex through the local ri-agent MCP server.",
      "Use Realinsight from Codex through the hosted Realinsight Streamable HTTP MCP server.",
    );
  }

  if (runtime === "node") {
    return value.replace(
      "Use Realinsight from Codex through the local ri-agent MCP server.",
      "Use Realinsight from Codex through the bundled local ri-agent MCP server.",
    );
  }

  return value;
}

function build_claude_plugin_manifest(manifest, env, build_options = {}) {
  return {
    ...manifest,
    name: env.plugin_name,
    displayName: env.display_name,
    version: version_for_env_upload(manifest.version, env, build_options.build_id),
  };
}

function version_for_env_upload(version, env, build_id) {
  if (!version || env.code === "prod" || !build_id) return version;
  return `${version}-${env.code}.${build_id}`;
}

function build_codex_marketplace(marketplace, env) {
  const plugin = source_marketplace_plugin(marketplace);
  const source = typeof plugin.source === "object" && plugin.source !== null
    ? plugin.source
    : {};

  return {
    ...marketplace,
    name: env.marketplace_name,
    interface: {
      ...(marketplace.interface || {}),
      displayName: env.marketplace_display,
    },
    plugins: [
      {
        ...plugin,
        name: env.plugin_name,
        source: {
          ...source,
          source: "local",
          path: `./plugins/codex/${env.plugin_name}`,
        },
      },
    ],
  };
}

function build_claude_marketplace(marketplace, env, build_options = {}) {
  const plugin = source_marketplace_plugin(marketplace);

  return {
    ...marketplace,
    name: env.marketplace_name,
    plugins: [
      {
        ...plugin,
        name: env.plugin_name,
        version: version_for_env_upload(plugin.version, env, build_options.build_id),
        source: `./plugins/claude/${env.plugin_name}`,
      },
    ],
  };
}

function source_marketplace_plugin(marketplace) {
  const plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  const plugin = plugins.find((item) => item.name === CONNECTOR_BASE_NAME) || plugins[0];

  if (!plugin) {
    throw new Error(`Marketplace manifest does not contain a ${CONNECTOR_BASE_NAME} plugin entry.`);
  }

  return plugin;
}

function build_codex_mcp_config(env, runtime, package_version) {
  return {
    mcpServers: {
      [env.server_name]: build_mcp_server(env, runtime, package_version, "codex"),
    },
  };
}

function build_claude_mcp_config(env, runtime, package_version) {
  return {
    mcpServers: {
      [env.server_name]: build_mcp_server(env, runtime, package_version, "claude-plugin"),
    },
  };
}

function build_mcp_server(env, runtime, _package_version, host) {
  const server = runtime === "http"
    ? {
        type: "http",
        url: `${env.base_url}/mcp`,
      }
    : runtime === "node"
    ? {
        type: "stdio",
        command: "node",
        args: [
          host === "claude-plugin" ? "${CLAUDE_PLUGIN_ROOT}/src/ri-agent.mjs" : "./src/ri-agent.mjs",
          "mcp",
        ],
        cwd: host === "claude-plugin" ? undefined : ".",
        env: build_mcp_env(env),
      }
    : {
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
      };

  if (server.type === undefined) delete server.type;
  if (server.cwd === undefined) delete server.cwd;
  return server;
}

function build_mcp_env(env) {
  return {
    RI_AGENT_BASE_URL: env.base_url,
    RI_AGENT_PROFILE: env.profile,
    RI_AGENT_MAX_TOOL_RESULT_BYTES: MAX_TOOL_RESULT_BYTES,
  };
}

function build_mcpb_manifest(manifest, env, build_options = {}) {
  const server = manifest.server || {};
  const mcp_config = server.mcp_config || {};

  return {
    ...manifest,
    name: env.plugin_name,
    display_name: env.display_name,
    version: version_for_env_upload(manifest.version, env, build_options.build_id),
    server: {
      ...server,
      mcp_config: {
        ...mcp_config,
        env: {
          ...(mcp_config.env || {}),
          REALINSIGHT_AGENT_CONFIG: mcpb_config_path(env),
        },
      },
    },
    user_config: {
      ...(manifest.user_config || {}),
      base_url: {
        ...(manifest.user_config?.base_url || {}),
        default: env.base_url,
      },
      profile_name: {
        ...(manifest.user_config?.profile_name || {}),
        default: env.profile,
      },
    },
  };
}

function build_mcpb_package(package_json, env, build_options = {}) {
  return {
    ...package_json,
    name: package_name_for_env(package_json.name, env),
    version: version_for_env_upload(package_json.version, env, build_options.build_id),
  };
}

function mcpb_config_path(env) {
  return env.code === "prod"
    ? "${HOME}/.realinsight/connector-claude-desktop.json"
    : `\${HOME}/.realinsight/connector-claude-desktop-${env.code}.json`;
}

function package_name_for_env(package_name, env) {
  if (!package_name) return package_name;
  if (env.code === "prod" || !env.suffix) return package_name;

  const slash = package_name.lastIndexOf("/");
  if (slash === -1) return `${package_name}-${env.suffix}`;

  return `${package_name.slice(0, slash + 1)}${package_name.slice(slash + 1)}-${env.suffix}`;
}

function build_marketplace_readme(host, env, runtime) {
  const install_target = host === "Codex" ? "Codex marketplace root" : "Claude marketplace root";
  const target = runtime === "http" || runtime === "mcp-remote" ? `${env.base_url}/mcp` : env.base_url;
  const auth_note = runtime === "http"
    ? "Authentication is handled by the host connector flow for the hosted MCP endpoint."
    : runtime === "mcp-remote"
    ? "Authentication is handled by mcp-remote through the hosted MCP OAuth flow."
    : `The default local auth profile is \`${env.profile}\`.`;

  return `# ${env.display_name} ${host} ${runtime} Bundle

This folder is a local ${install_target} for ${env.display_name}.

Add this folder as the marketplace root, then install \`${env.plugin_name}\` from the \`${env.marketplace_name}\` marketplace.

The plugin points to:

\`\`\`text
${target}
\`\`\`

${auth_note}
`;
}

function build_plugin_readme(host, env, runtime, package_version) {
  const runtime_text = runtime === "http"
    ? "hosted Streamable HTTP MCP endpoint"
    : runtime === "node"
    ? "bundled local `ri-agent` runtime"
    : "hosted Streamable HTTP MCP endpoint bridged through local stdio by `mcp-remote`";
  const run_command = runtime === "http"
    ? `${env.base_url}/mcp`
    : runtime === "node"
    ? "node ./src/ri-agent.mjs mcp"
    : `npx -y mcp-remote@latest ${env.base_url}/mcp --transport http-only --auth-timeout 120`;
  const login_command = runtime === "http"
    ? "Use the host application's connector OAuth flow."
    : runtime === "node"
    ? `node ./src/ri-agent.mjs auth login --base-url ${env.base_url} --profile ${env.profile}`
    : "Complete the browser OAuth flow started by mcp-remote.";

  const auth_section = runtime === "http" || runtime === "mcp-remote"
    ? "Authentication is handled by the host application's connector/OAuth flow."
    : `For manual auth testing:

\`\`\`text
${login_command}
\`\`\``;
  const profile_section = runtime === "http" || runtime === "mcp-remote"
    ? ""
    : `\nThe default local auth profile is \`${env.profile}\`.\n`;

  return `# ${env.display_name} For ${host}

This ${host} plugin bundles the Realinsight skill and connects to the ${runtime_text}.

The MCP server runs:

\`\`\`text
${run_command}
\`\`\`

By default it points to:

\`\`\`text
${env.base_url}
\`\`\`
${profile_section}

${auth_section}
`;
}

function build_mcpb_readme(env) {
  return `# ${env.display_name} For Claude Desktop

This folder is the source for a Claude Desktop \`.mcpb\` local extension.

The manifest points to:

\`\`\`text
${env.base_url}
\`\`\`

The default local auth profile is \`${env.profile}\`.
`;
}

function pack_mcpb(source_root, output_root, packer) {
  const mode = packer || "auto";
  const attempts = [];

  if (mode === "auto" || mode === "local") {
    attempts.push({
      command: process.platform === "win32" ? "mcpb.cmd" : "mcpb",
      args: ["pack", source_root],
    });
  }

  if (mode === "auto" || mode === "npx") {
    attempts.push({
      command: process.platform === "win32" ? "npx.cmd" : "npx",
      args: ["-y", "@anthropic-ai/mcpb", "pack", source_root],
    });
  }

  for (const attempt of attempts) {
    const result = spawnSync(attempt.command, attempt.args, {
      cwd: output_root,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    if (result.status === 0) {
      const packed = find_latest_file(output_root, ".mcpb");
      return packed || path.join(output_root, `${path.basename(source_root)}.mcpb`);
    }

    if (mode !== "auto") {
      throw new Error(`mcpb pack failed using ${mode}.`);
    }
  }

  console.warn("Warning: mcpb pack was requested, but no mcpb packer succeeded. Source zip was still created.");
  return null;
}

function find_latest_file(dir, extension) {
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith(extension))
      .map((name) => path.join(dir, name))
      .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] || null;
  }
  catch {
    return null;
  }
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
      if (!should_copy_entry(path.join(dir, entry.name))) continue;
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
