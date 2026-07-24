const selectors = {
  harness: document.querySelector("#harness-select"),
  surface: document.querySelector("#surface-select"),
  transport: document.querySelector("#transport-select"),
  environment: document.querySelector("#environment-select"),
};

const output = {
  harness: document.querySelector("#output-harness"),
  surface: document.querySelector("#output-surface"),
  transport: document.querySelector("#output-transport"),
  environment: document.querySelector("#output-environment"),
  title: document.querySelector("#output-title"),
  summary: document.querySelector("#output-summary"),
  steps: document.querySelector("#output-steps"),
  codeWrap: document.querySelector("#code-wrap"),
  codeLabel: document.querySelector("#code-label"),
  code: document.querySelector("#output-code"),
  note: document.querySelector("#output-note"),
  source: document.querySelector("#source-link"),
  copy: document.querySelector("#copy-button"),
};

let catalog;

start().catch((error) => {
  output.title.textContent = "Install catalog unavailable";
  output.summary.textContent = "Use the agent-readable install guide linked below.";
  output.note.textContent = error instanceof Error ? error.message : String(error);
  output.codeWrap.hidden = true;
});

async function start() {
  const response = await fetch("./install-data.json");
  if (!response.ok) {
    throw new Error(`Could not load install-data.json (${response.status}).`);
  }
  catalog = await response.json();

  selectors.harness.value = catalog.defaults.harness;
  selectors.surface.value = catalog.defaults.surface;
  selectors.transport.value = catalog.defaults.transport;
  selectors.environment.value = catalog.defaults.environment;

  Object.values(selectors).forEach((select) => select.addEventListener("change", render));
  output.copy.addEventListener("click", copy_code);
  render();
}

function render() {
  const harness = catalog.harnesses[selectors.harness.value];
  const environment = catalog.environments[selectors.environment.value];
  const surface = selectors.surface.value;
  const transport = selectors.transport.value;
  const guide = !harness.surfaces.includes(surface)
    ? unsupported_surface_guide(harness, surface)
    : transport === "remote"
      ? remote_guide(selectors.harness.value, harness, environment, surface)
      : local_guide(selectors.harness.value, harness, environment, selectors.environment.value, surface);

  output.harness.textContent = harness.label;
  output.surface.textContent = surface === "desktop" ? "Desktop app" : "CLI";
  output.transport.textContent = transport === "remote" ? "Remote HTTP" : "Local Node";
  output.environment.textContent = environment.label;
  output.title.textContent = guide.title;
  output.summary.textContent = guide.summary;
  output.steps.replaceChildren(...guide.steps.map((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    return item;
  }));
  output.codeWrap.hidden = !guide.code;
  output.codeLabel.textContent = guide.codeLabel ?? "Configuration";
  output.code.textContent = guide.code ?? "";
  output.note.textContent = guide.note;
  output.source.href = guide.source;
  output.source.textContent = "View checked-in source";
  output.copy.textContent = "Copy";
}

function remote_guide(harness_key, harness, environment, surface) {
  const plugin_name = environment.plugin_name;
  const generic_config = JSON.stringify({
    mcpServers: {
      [environment.server_name]: {
        type: "http",
        url: environment.mcp_url,
      },
    },
  }, null, 2);

  if (harness_key === "chatgpt") {
    return {
      title: `Connect ChatGPT to ${environment.label}`,
      summary: "Use a remote custom MCP connector. This repository does not document a local Node path for ChatGPT.",
      steps: [
        "In the ChatGPT workspace connector settings, add a custom MCP connector.",
        "Use the exact endpoint below and keep the connector’s OAuth flow enabled.",
        "Complete the Realinsight browser sign-in, then make a small schema or tool-reference request to verify access.",
      ],
      codeLabel: "Remote MCP endpoint",
      code: environment.mcp_url,
      note: environment.warning ?? "Production is the public default. Your Realinsight permissions and customer context still apply.",
      source: github_source(environment.remote_example),
    };
  }

  if (harness_key === "codex") {
    if (surface === "desktop") {
      return {
        title: `Install ${plugin_name} in Codex Desktop`,
        summary: "Use the native app’s GitHub marketplace flow. The repository root exposes production, QA, and development plugins.",
        steps: [
          "In Codex Desktop, add a GitHub plugin marketplace using the public repository below.",
          "Use the main reference and leave Sparse paths empty; sparse paths do not change the marketplace root.",
          `Open the plugin browser and install ${plugin_name}.`,
          "Complete Realinsight OAuth, then verify with get_tool_reference or a small schema search.",
        ],
        codeLabel: "Codex Desktop marketplace fields",
        code: `Repository: https://github.com/cwfs-insight/realinsight-agent-toolkit\nReference: main\nSparse paths: leave empty\nPlugin: ${plugin_name}`,
        note: "The native desktop app is the primary Codex path. Production remains the default marketplace entry.",
        source: github_source("docs/install/codex.md"),
      };
    }

    return {
      title: `Install ${plugin_name} with the Codex CLI`,
      summary: "The repository-root marketplace bundles the Realinsight skill and selected hosted MCP endpoint.",
      steps: [
        "Add the public repository as a Codex plugin marketplace.",
        `Open /plugins and install ${plugin_name}.`,
        "Complete the Realinsight OAuth prompt, then ask the agent for get_tool_reference or a small schema search.",
      ],
      codeLabel: "Terminal",
      code: "codex plugin marketplace add cwfs-insight/realinsight-agent-toolkit --ref main\ncodex",
      note: "The CLI opens Codex after adding the marketplace; use /plugins to choose the selected environment plugin.",
      source: github_source(environment.providers.codex),
    };
  }

  if (harness_key === "claude") {
    if (surface === "desktop") {
      return {
        title: `Connect Claude Desktop to ${environment.label}`,
        summary: "Use Claude Desktop’s custom connector flow with the selected hosted MCP endpoint.",
        steps: [
          "In Claude Desktop, open the connector settings and add a custom remote MCP connector.",
          "Use the exact endpoint below and keep OAuth enabled.",
          "Complete the Realinsight browser sign-in.",
          "Verify with get_tool_reference or a small schema search.",
        ],
        codeLabel: "Claude Desktop remote MCP endpoint",
        code: environment.mcp_url,
        note: "The hosted connector is the primary Claude Desktop path. Choose Local Node only when a local MCPB extension is required.",
        source: github_source("docs/install/claude.md"),
      };
    }

    return {
      title: `Install ${plugin_name} in Claude Code`,
      summary: "The Claude marketplace entry bundles the Realinsight skill and hosted MCP configuration.",
      steps: [
        "Add the public Realinsight marketplace.",
        `Install ${plugin_name} from the realinsight marketplace.`,
        "Complete the Realinsight OAuth prompt, then verify with a tool-reference or schema request.",
      ],
      codeLabel: "Claude Code",
      code: `/plugin marketplace add cwfs-insight/realinsight-agent-toolkit\n/plugin install ${plugin_name}@realinsight`,
      note: "For a Claude surface that accepts custom remote MCP connectors instead of plugins, use the selected endpoint directly.",
      source: github_source(environment.providers.claude),
    };
  }

  if (harness_key === "cursor") {
    return {
      title: `Connect Cursor to ${environment.label}`,
      summary: "Use the checked-in Cursor provider plugin or copy its remote HTTP MCP configuration.",
      steps: [
        `Use the repository plugin path ${environment.providers.cursor}.`,
        "If installing through MCP settings instead, add the configuration below.",
        "Complete OAuth when prompted and pair the connection with the bundled Realinsight skill.",
      ],
      codeLabel: "MCP configuration",
      code: generic_config,
      note: "The provider plugin includes both mcp.json and the agent-readable Realinsight skill.",
      source: github_source(`${environment.providers.cursor}/mcp.json`),
    };
  }

  return {
    title: `Connect ${harness.label} to ${environment.label}`,
    summary: "Use direct remote HTTP MCP when the harness supports authenticated remote servers.",
    steps: [
      "Open the harness’s MCP server settings.",
      "Add the exact remote HTTP configuration below.",
      "Complete OAuth when prompted. If the harness cannot do remote OAuth MCP, choose Local Node instead.",
    ],
    codeLabel: "Generic MCP configuration",
    code: generic_config,
    note: "MCP configuration shapes vary by harness. The endpoint is authoritative; adapt only the outer configuration wrapper if required.",
    source: github_source(environment.remote_example),
  };
}

function local_guide(harness_key, harness, environment, environment_code, surface) {
  if (!harness.local_node) {
    return {
      title: `Use remote MCP with ${harness.label}`,
      summary: "No repository-backed local Node install is documented for this harness.",
      steps: [
        "Switch Transport to Remote HTTP MCP.",
        "Use the selected Realinsight endpoint and complete OAuth in the harness.",
      ],
      code: "",
      note: "The toolkit is not published for native npx installation. Do not substitute an unpublished package command.",
      source: "./agent-install.md",
    };
  }

  if (harness_key === "codex") {
    const marketplace = `/absolute/path/to/realinsight-agent-toolkit/.tmp/plugin-packages/${environment_code}/node/codex/marketplace`;
    if (surface === "desktop") {
      return {
        title: `Install a local Node plugin in Codex Desktop`,
        summary: "Build an environment-specific local marketplace, then add that folder in the native desktop app.",
        steps: [
          "Clone this repository and run the packaging command below from its root.",
          "Replace the absolute path in the generated marketplace location.",
          `In Codex Desktop, add that local marketplace folder and install ${environment.plugin_name}.`,
          "Use auth_status or connect_realinsight to verify the isolated local profile.",
        ],
        codeLabel: "Build and local marketplace path",
        code: `npm run package:plugins -- --env ${environment_code} --type codex --runtime node\n\nMarketplace folder:\n${marketplace}`,
        note: "This bundles checked-in Node source for the desktop app. It does not install a native Realinsight npm/npx package.",
        source: github_source("tools/package-env-bundles.mjs"),
      };
    }

    return {
      title: `Build a local Node Codex plugin for ${environment.label}`,
      summary: "The repository’s packaging script bundles checked-in Node source into a local Codex marketplace.",
      steps: [
        "Clone this repository and run the packaging command below from its root.",
        "Replace the absolute repository path in the marketplace command.",
        `Open /plugins and install ${environment.plugin_name} from the generated local marketplace.`,
        "Use auth_status or connect_realinsight to verify the isolated local profile before reading data.",
      ],
      codeLabel: "Terminal",
      code: `npm run package:plugins -- --env ${environment_code} --type codex --runtime node\ncodex plugin marketplace add ${marketplace}\ncodex`,
      note: "This bundles local Node source. It does not install or invoke a native Realinsight npm/npx package.",
      source: github_source("tools/package-env-bundles.mjs"),
    };
  }

  if (harness_key === "claude") {
    if (surface === "desktop") {
      const source = `.tmp/plugin-packages/${environment_code}/node/claude-mcpb/source`;
      return {
        title: `Build a local Claude Desktop extension for ${environment.label}`,
        summary: "Generate an environment-specific MCPB source bundle, pack it, and install the resulting extension in Claude Desktop.",
        steps: [
          "Clone this repository and run the environment-specific bundle command below.",
          "Pack the generated MCPB source with the installed mcpb utility.",
          "Install the resulting .mcpb file in Claude Desktop.",
          "Use connect_realinsight or auth_status in Claude to complete and verify local authentication.",
        ],
        codeLabel: "Terminal",
        code: `npm run package:plugins -- --env ${environment_code} --type claude-mcpb --runtime node\nmcpb pack ${source}`,
        note: "The MCPB includes checked-in Node source and an isolated environment profile. It does not require a published toolkit package.",
        source: github_source("docs/claude-desktop-extension.md"),
      };
    }

    const marketplace = `/absolute/path/to/realinsight-agent-toolkit/.tmp/plugin-packages/${environment_code}/node/claude-plugin/marketplace`;
    const marketplace_name = environment_code === "prod" ? "realinsight" : `realinsight-${environment_code}`;
    return {
      title: `Build a local Node Claude plugin for ${environment.label}`,
      summary: "The repository’s packaging script bundles checked-in Node source into a local Claude marketplace.",
      steps: [
        "Clone this repository and run the packaging command below from its root.",
        "Replace the absolute repository path before adding the local marketplace in Claude Code.",
        `Install ${environment.plugin_name} from ${marketplace_name}.`,
        "Use auth_status or connect_realinsight to verify the isolated local profile before reading data.",
      ],
      codeLabel: "Build, then run in Claude Code",
      code: `npm run package:plugins -- --env ${environment_code} --type claude-plugin --runtime node\n/plugin marketplace add ${marketplace}\n/plugin install ${environment.plugin_name}@${marketplace_name}`,
      note: "This bundles local Node source. It does not install or invoke a native Realinsight npm/npx package.",
      source: github_source("tools/package-env-bundles.mjs"),
    };
  }

  const config = {
    mcpServers: {
      [environment.server_name]: {
        type: "stdio",
        command: "node",
        args: ["./src/ri-agent.mjs", "mcp"],
        cwd: "/absolute/path/to/realinsight-agent-toolkit/packages/agent-toolkit",
        env: {
          RI_AGENT_BASE_URL: environment.base_url,
          RI_AGENT_PROFILE: environment.profile,
          REALINSIGHT_AGENT_CONFIG: `/absolute/path/to/.realinsight/agent-toolkit-${environment.profile_suffix}.json`,
          RI_AGENT_MAX_TOOL_RESULT_BYTES: "240000",
        },
      },
    },
  };

  return {
    title: `Run local Node MCP for ${harness.label}`,
    summary: "This optional developer path runs checked-in source from a local clone; it does not use an npm or npx toolkit package.",
    steps: [
      "Clone this repository and keep the checkout path stable.",
      `Run the local auth command for ${environment.label}: node packages/agent-toolkit/src/ri-agent.mjs auth login --base-url ${environment.base_url} --profile ${environment.profile}.`,
      "Replace both /absolute/path placeholders below, then add the server in the harness’s local stdio MCP settings.",
      "Call auth_status or doctor before reading data to confirm the selected profile and base URL.",
    ],
    codeLabel: "Local stdio MCP configuration",
    code: JSON.stringify(config, null, 2),
    note: "Credential files stay outside the repository. Never commit tokens, local profiles, or .realinsight directories.",
    source: github_source(environment.local_example),
  };
}

function unsupported_surface_guide(harness, surface) {
  const requested = surface === "desktop" ? "native desktop app" : "CLI";
  const supported = harness.surfaces.includes("desktop") ? "Native desktop app" : "CLI / terminal";
  return {
    title: `${requested} is not documented for ${harness.label}`,
    summary: "The repository does not provide a verified install path for this combination.",
    steps: [
      `Change Install surface to ${supported}.`,
      "Keep the selected transport and environment, then follow the regenerated instructions.",
    ],
    code: "",
    note: "This guide leaves unsupported combinations unavailable instead of guessing host-specific setup.",
    source: github_source(harness.guide),
  };
}

function github_source(path) {
  return `${catalog.repository}/blob/main/${path}`;
}

async function copy_code() {
  const value = output.code.textContent;
  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const area = document.createElement("textarea");
    area.value = value;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }

  output.copy.textContent = "Copied";
  window.setTimeout(() => {
    output.copy.textContent = "Copy";
  }, 1400);
}
