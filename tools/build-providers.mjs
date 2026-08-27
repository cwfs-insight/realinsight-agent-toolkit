#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROVIDERS_ROOT = path.join(REPO_ROOT, "providers");
const CONNECTOR_BASE_NAME = "realinsight-connector";
const REALINSIGHT_HOMEPAGE = "https://www.realinsight.com";

const ENVS = [
  {
    code: "prod",
    suffix: "",
    marketplace_name: "realinsight",
    marketplace_display: "Realinsight",
    display_name: "Realinsight Connector",
    base_url: "https://www.realinsight.cloud/api/v1",
  },
  {
    code: "dev",
    suffix: "dev",
    marketplace_name: "realinsight-dev",
    marketplace_display: "Realinsight Dev",
    display_name: "Realinsight Connector Dev",
    base_url: "https://www.ri2-dev.com/api/v1",
  },
  {
    code: "qa",
    suffix: "qa",
    marketplace_name: "realinsight-qa",
    marketplace_display: "Realinsight QA",
    display_name: "Realinsight Connector QA",
    base_url: "https://www.ri2-qa.com/api/v1",
  },
];

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});

async function main() {
  await reset_dir(PROVIDERS_ROOT);
  await write_provider_readmes();

  for (const env of ENVS) {
    await render_codex_provider(env);
    await render_claude_provider(env);
    await render_cursor_provider(env);
  }

  console.log("Built provider marketplaces:");
  for (const env of ENVS) {
    console.log(`- providers/codex/${env.code}`);
    console.log(`- providers/claude/${env.code}`);
    console.log(`- ${cursor_provider_label(env)}`);
  }
}

async function render_codex_provider(env) {
  const root = path.join(PROVIDERS_ROOT, "codex", env.code);
  const plugin_name = env.suffix ? `${CONNECTOR_BASE_NAME}-${env.suffix}` : CONNECTOR_BASE_NAME;
  const server_name = env.suffix ? `realinsight-agent-toolkit-${env.suffix}` : "realinsight-agent-toolkit";
  const plugin_root = path.join(root, "plugins/codex", plugin_name);
  const source_plugin_root = path.join(REPO_ROOT, "plugins/codex/realinsight-connector");

  await copy_dir(source_plugin_root, plugin_root);
  await rewrite_skill_base_urls(path.join(plugin_root, "skills"), env);

  const manifest = await read_json(path.join(plugin_root, ".codex-plugin/plugin.json"));
  manifest.name = plugin_name;
  manifest.version = env.suffix ? `${manifest.version}-${env.suffix}` : manifest.version;
  manifest.interface = {
    ...(manifest.interface || {}),
    displayName: env.display_name,
    capabilities: ["Interactive", "Read", "Write"],
    longDescription: hosted_long_description(manifest.interface?.longDescription),
  };

  await write_json(path.join(plugin_root, ".codex-plugin/plugin.json"), manifest);
  await write_json(path.join(plugin_root, ".mcp.json"), {
    mcpServers: {
      [server_name]: {
        type: "http",
        url: `${env.base_url}/mcp`,
      },
    },
  });
  await fs.writeFile(path.join(plugin_root, "README.md"), codex_plugin_readme(env));
  await write_json(path.join(root, ".agents/plugins/marketplace.json"), {
    name: env.marketplace_name,
    interface: {
      displayName: env.marketplace_display,
    },
    plugins: [
      {
        name: plugin_name,
        source: {
          source: "local",
          path: `./plugins/codex/${plugin_name}`,
        },
        policy: {
          installation: "AVAILABLE",
          authentication: "ON_INSTALL",
        },
        category: "Developer Tools",
      },
    ],
  });
  await fs.writeFile(path.join(root, "README.md"), codex_env_readme(env, plugin_name));
}

async function render_claude_provider(env) {
  const root = path.join(PROVIDERS_ROOT, "claude", env.code);
  const plugin_name = env.suffix ? `${CONNECTOR_BASE_NAME}-${env.suffix}` : CONNECTOR_BASE_NAME;
  const server_name = env.suffix ? `realinsight-agent-toolkit-${env.suffix}` : "realinsight-agent-toolkit";
  const plugin_root = path.join(root, "plugins/claude", plugin_name);
  const source_plugin_root = path.join(REPO_ROOT, "plugins/claude/realinsight-connector");

  await copy_dir(source_plugin_root, plugin_root);
  await rewrite_skill_base_urls(path.join(plugin_root, "skills"), env);

  const manifest = await read_json(path.join(plugin_root, ".claude-plugin/plugin.json"));
  manifest.name = plugin_name;
  manifest.displayName = env.display_name;
  manifest.version = env.suffix ? `${manifest.version}-${env.suffix}` : manifest.version;

  await write_json(path.join(plugin_root, ".claude-plugin/plugin.json"), manifest);
  await write_json(path.join(plugin_root, ".mcp.json"), {
    mcpServers: {
      [server_name]: {
        type: "http",
        url: `${env.base_url}/mcp`,
      },
    },
  });
  await fs.writeFile(path.join(plugin_root, "README.md"), claude_plugin_readme(env));
  await write_json(path.join(root, ".claude-plugin/marketplace.json"), {
    name: env.marketplace_name,
    owner: {
      name: "Realinsight",
      url: REALINSIGHT_HOMEPAGE,
    },
    plugins: [
      {
        name: plugin_name,
        displayName: env.display_name,
        source: `./plugins/claude/${plugin_name}`,
        description: "Connect Claude to Realinsight tools and skills.",
        version: manifest.version,
        author: {
          name: "Realinsight",
        },
        homepage: REALINSIGHT_HOMEPAGE,
        repository: "https://github.com/cwfs-insight/realinsight-agent-toolkit",
        license: "MIT",
        keywords: [
          "realinsight",
          "mcp",
          "commercial-real-estate",
          "analytics",
        ],
      },
    ],
  });
  await fs.writeFile(path.join(root, "README.md"), claude_env_readme(env, plugin_name));
}

async function render_cursor_provider(env) {
  const root = cursor_provider_root(env);
  const plugin_name = env.suffix ? `${CONNECTOR_BASE_NAME}-${env.suffix}` : CONNECTOR_BASE_NAME;
  const server_name = env.suffix ? `realinsight-agent-toolkit-${env.suffix}` : "realinsight-agent-toolkit";
  const skill_root = path.join(root, "skills/realinsight-agent-toolkit");
  const source_manifest = await read_json(path.join(REPO_ROOT, "plugins/codex/realinsight-connector/.codex-plugin/plugin.json"));
  const version = source_manifest.version || "0.2.3";
  const description = cursor_description(source_manifest.description);

  await fs.mkdir(path.join(root, ".cursor-plugin"), { recursive: true });
  await copy_dir(path.join(REPO_ROOT, "skills/realinsight-agent-toolkit"), skill_root);
  await rewrite_skill_base_urls(path.join(root, "skills"), env);

  await write_json(path.join(root, ".cursor-plugin/plugin.json"), {
    name: plugin_name,
    description,
    version: env.suffix ? `${version}-${env.suffix}` : version,
    author: {
      name: "Realinsight",
      url: REALINSIGHT_HOMEPAGE,
    },
    homepage: REALINSIGHT_HOMEPAGE,
    repository: "https://github.com/cwfs-insight/realinsight-agent-toolkit",
    license: "MIT",
    keywords: source_manifest.keywords || [
      "realinsight",
      "mcp",
      "commercial-real-estate",
      "analytics",
    ],
  });

  await write_json(path.join(root, "mcp.json"), {
    mcpServers: {
      [server_name]: {
        type: "http",
        url: `${env.base_url}/mcp`,
      },
    },
  });

  await fs.writeFile(path.join(root, "README.md"), cursor_plugin_readme(env, plugin_name));
}

function hosted_long_description(description) {
  const fallback = "Use Realinsight from Codex through the hosted Realinsight Streamable HTTP MCP server.";
  return (description || fallback)
    .replace(
      "Use Realinsight from Codex through the local ri-agent MCP server.",
      "Use Realinsight from Codex through the hosted Realinsight Streamable HTTP MCP server.",
    )
    .replace(
      "Use Realinsight from Codex through the bundled local ri-agent MCP server.",
      "Use Realinsight from Codex through the hosted Realinsight Streamable HTTP MCP server.",
    );
}

function cursor_description(description) {
  return (description || "Realinsight plugin for authenticated tools and skills.").replace(/^Codex plugin/i, "Cursor plugin");
}

async function rewrite_skill_base_urls(root, env) {
  const prod_base_url = "https://www.realinsight.cloud/api/v1";
  if (env.base_url === prod_base_url) return;

  const files = await list_files(root);
  await Promise.all(files.map(async (file) => {
    const text = await fs.readFile(file, "utf8");
    if (!text.includes(prod_base_url)) return;
    await fs.writeFile(file, text.replaceAll(prod_base_url, env.base_url));
  }));
}

async function write_provider_readmes() {
  await fs.mkdir(path.join(PROVIDERS_ROOT, "codex"), { recursive: true });
  await fs.writeFile(path.join(PROVIDERS_ROOT, "README.md"), `# Provider Plugins

This directory contains checked-in provider marketplaces for agent hosts.

Use the root repository marketplace for the default production Codex install. Use the environment-specific provider folders when you need an explicit development or QA connector from the public GitHub repo.

Provider skill files are generated from the root exported skill copy. Do not edit skill files in provider directories manually.
`);

  await fs.writeFile(path.join(PROVIDERS_ROOT, "codex/README.md"), `# Codex Providers

Each folder is a Codex marketplace root:

- \`prod/\`: production Realinsight connector.
- \`dev/\`: development Realinsight connector.
- \`qa/\`: QA Realinsight connector.

When Codex asks for a repository path, use one of these folders as the marketplace path.
`);

  await fs.mkdir(path.join(PROVIDERS_ROOT, "claude"), { recursive: true });
  await fs.writeFile(path.join(PROVIDERS_ROOT, "claude/README.md"), `# Claude Providers

Each folder is a Claude Code marketplace root:

- \`prod/\`: production Realinsight connector.
- \`dev/\`: development Realinsight connector.
- \`qa/\`: QA Realinsight connector.

When Claude asks for a marketplace repository path, use one of these folders as the marketplace path.
`);

  await fs.mkdir(path.join(PROVIDERS_ROOT, "cursor"), { recursive: true });
  await fs.writeFile(path.join(PROVIDERS_ROOT, "cursor/README.md"), `# Cursor Providers

Cursor plugin folders follow the Stripe-style layout with \`.cursor-plugin/plugin.json\`, \`mcp.json\`, and \`skills/\`.

- \`plugin/\`: production Realinsight connector.
- \`dev/plugin/\`: development Realinsight connector.
- \`qa/plugin/\`: QA Realinsight connector.

Use \`providers/cursor/plugin\` for the default production install path when adding this repository to Cursor.
`);
}

function codex_env_readme(env, plugin_name) {
  return `# ${env.display_name} Codex Provider

This folder is a Codex marketplace root for the ${env.code} Realinsight connector.

Plugin: \`${plugin_name}\`
MCP endpoint: \`${env.base_url}/mcp\`

When adding from GitHub, use this folder path:

\`\`\`text
providers/codex/${env.code}
\`\`\`

Install \`${plugin_name}\` from the \`${env.marketplace_name}\` marketplace.
`;
}

function codex_plugin_readme(env) {
  return `# ${env.display_name} For Codex

This Codex plugin bundles the Realinsight skill and connects to the hosted Realinsight Streamable HTTP MCP server.

The bundled MCP config points to:

\`\`\`text
${env.base_url}/mcp
\`\`\`

Authentication is handled by the host's MCP OAuth flow and uses the normal Realinsight browser login, SSO, and MFA flow.
`;
}

function claude_env_readme(env, plugin_name) {
  return `# ${env.display_name} Claude Provider

This folder is a Claude Code marketplace root for the ${env.code} Realinsight connector.

Plugin: \`${plugin_name}\`
MCP endpoint: \`${env.base_url}/mcp\`

When adding from GitHub, use this folder path:

\`\`\`text
providers/claude/${env.code}
\`\`\`

Install \`${plugin_name}\` from the \`${env.marketplace_name}\` marketplace.
`;
}

function claude_plugin_readme(env) {
  return `# ${env.display_name} For Claude

This Claude plugin bundles the Realinsight skill and connects to the hosted Realinsight Streamable HTTP MCP server.

The plugin-provided MCP server points to:

\`\`\`text
${env.base_url}/mcp
\`\`\`

Authentication is handled by the host's MCP OAuth flow and uses the normal Realinsight browser login, SSO, and MFA flow.
`;
}

function cursor_provider_root(env) {
  if (env.code === "prod") return path.join(PROVIDERS_ROOT, "cursor", "plugin");
  return path.join(PROVIDERS_ROOT, "cursor", env.code, "plugin");
}

function cursor_provider_label(env) {
  return path.relative(REPO_ROOT, cursor_provider_root(env));
}

function cursor_plugin_readme(env, plugin_name) {
  const path_hint = env.code === "prod" ? "providers/cursor/plugin" : `providers/cursor/${env.code}/plugin`;
  return `# ${env.display_name} For Cursor

This Cursor plugin follows the \`.cursor-plugin/plugin.json\`, \`mcp.json\`, and \`skills/\` layout used by Cursor plugin distributions.

Plugin: \`${plugin_name}\`
MCP endpoint: \`${env.base_url}/mcp\`

When adding from GitHub, use this folder path:

\`\`\`text
${path_hint}
\`\`\`

The bundled \`mcp.json\` points at the hosted Realinsight Streamable HTTP MCP endpoint. Authentication is handled by Cursor's MCP flow when supported by the installed Cursor version.
`;
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
  return true;
}

async function list_files(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const full_path = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await list_files(full_path));
    }
    else if (entry.isFile()) {
      files.push(full_path);
    }
  }

  return files;
}

async function read_json(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function write_json(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
