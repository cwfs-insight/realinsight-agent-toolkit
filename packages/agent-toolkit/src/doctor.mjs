import { promises as fs } from "node:fs";

import { option_bool, option_value } from "./args.mjs";
import { load_fresh_profile_by_name, load_stored_profile_by_name } from "./auth.mjs";
import { build_url, format_error_message, request_json } from "./http.mjs";
import {
  AGENT_TOOLS,
  CONFIG_PATH,
  MCP_SERVER_INFO,
} from "./tool-definitions.mjs";

const CHECK_TIMEOUT_MS = 5000;

export async function doctor(options) {
  const json = option_bool(options, "json", false);
  const requested_profile_name = option_value(options, "profile", null);
  const checks = [];
  let stored_profile = null;
  let fresh_profile = null;
  let current_user = null;
  let metadata = null;

  await run_check(checks, "local_tools", async () => {
    assert_unique_tool_names(AGENT_TOOLS, "local toolkit");

    return pass(
      `${AGENT_TOOLS.length} local tools loaded for ${MCP_SERVER_INFO.name} ${MCP_SERVER_INFO.version}.`,
      { tool_names: AGENT_TOOLS.map((tool) => tool.name) },
    );
  });

  await run_check(checks, "config_file", async () => {
    let stat;

    try {
      stat = await fs.stat(CONFIG_PATH);
    }
    catch (error) {
      if (error?.code === "ENOENT") {
        throw new Error(`Credential file not found at ${CONFIG_PATH}. Run ri-agent auth login first.`);
      }

      throw error;
    }

    const details = {
      path: CONFIG_PATH,
      size_bytes: stat.size,
    };

    if (process.platform !== "win32") {
      const mode = stat.mode & 0o777;
      details.mode = `0${mode.toString(8)}`;

      if ((mode & 0o077) !== 0) {
        return warn(
          `Credential file exists at ${CONFIG_PATH}, but group/other permissions are enabled.`,
          details,
        );
      }
    }

    return pass(`Credential file found at ${CONFIG_PATH}.`, details);
  });

  await run_check(checks, "auth_profile", async () => {
    stored_profile = await load_stored_profile_by_name(requested_profile_name);

    return pass(
      `Profile ${stored_profile.name} found in local credentials.`,
      {
        profile: stored_profile.name,
        base_url: stored_profile.profile.base_url,
        client_id: stored_profile.profile.client_id,
        customer_number: stored_profile.profile.customer_number,
        user_id: stored_profile.profile.user_id,
        expires_at_utc: stored_profile.profile.expires_at_utc,
      },
    );
  });

  if (!stored_profile) {
    add_skip(checks, "core_api", "Skipped because no local auth profile was loaded.");
    add_skip(checks, "auth_refresh", "Skipped because no local auth profile was loaded.");
    add_skip(checks, "oauth_me", "Skipped because no usable auth profile was loaded.");
    add_skip(checks, "agent_metadata", "Skipped because no usable auth profile was loaded.");
    add_skip(checks, "tool_inventory", "Skipped because server metadata was not available.");
    add_skip(checks, "scope_coverage", "Skipped because user scope metadata was not available.");

    finish(checks, json, null, null);
    return;
  }

  const stored_profile_details = stored_profile.profile;

  await run_check(checks, "core_api", async () => {
    const protected_resource = await request_json(build_url(stored_profile_details.base_url, "/.well-known/oauth-protected-resource"), {
      method: "GET",
      timeout_ms: CHECK_TIMEOUT_MS,
    });

    return pass(
      `Core API is reachable at ${stored_profile_details.base_url}.`,
      {
        resource: protected_resource.resource,
        authorization_servers: protected_resource.authorization_servers || [],
      },
    );
  });

  await run_check(checks, "auth_refresh", async () => {
    fresh_profile = await load_fresh_profile_by_name(requested_profile_name, {
      timeout_ms: CHECK_TIMEOUT_MS,
    });

    return pass(
      `Profile ${fresh_profile.name} loaded and access token is fresh enough to use.`,
      {
        profile: fresh_profile.name,
        base_url: fresh_profile.profile.base_url,
        client_id: fresh_profile.profile.client_id,
        customer_number: fresh_profile.profile.customer_number,
        user_id: fresh_profile.profile.user_id,
        expires_at_utc: fresh_profile.profile.expires_at_utc,
      },
    );
  });

  if (!fresh_profile) {
    add_skip(checks, "oauth_me", "Skipped because token refresh/auth validation failed.");
    add_skip(checks, "agent_metadata", "Skipped because token refresh/auth validation failed.");
    add_skip(checks, "tool_inventory", "Skipped because server metadata was not available.");
    add_skip(checks, "scope_coverage", "Skipped because user scope metadata was not available.");

    finish(checks, json, stored_profile, current_user);
    return;
  }

  const profile = fresh_profile.profile;

  await run_check(checks, "oauth_me", async () => {
    current_user = await request_json(build_url(profile.base_url, "/oauth/me"), {
      method: "GET",
      bearer_token: profile.access_token,
      timeout_ms: CHECK_TIMEOUT_MS,
    });

    return pass(
      `Authenticated as user ${current_user.user_id} for customer ${current_user.customer_number}.`,
      {
        credential_type: current_user.credential_type,
        customer_number: current_user.customer_number,
        customer_id: current_user.customer_id,
        user_id: current_user.user_id,
        expires_at_utc: current_user.expires_at_utc,
        scopes: current_user.scopes || [],
      },
    );
  });

  await run_check(checks, "agent_metadata", async () => {
    metadata = await request_json(build_url(profile.base_url, "/agent/metadata"), {
      method: "GET",
      bearer_token: profile.access_token,
      timeout_ms: CHECK_TIMEOUT_MS,
    });

    if (!Array.isArray(metadata.tools)) {
      throw new Error("/agent/metadata did not return a tools array.");
    }

    return pass(
      `Agent metadata loaded from Core API version ${metadata.api_version || "unknown"}.`,
      {
        api_version: metadata.api_version || "",
        tool_names: metadata.tools.map((tool) => tool.name).filter(Boolean),
      },
    );
  });

  if (!metadata) {
    add_skip(checks, "tool_inventory", "Skipped because server metadata was not available.");
    add_skip(checks, "scope_coverage", "Skipped because server metadata was not available.");

    finish(checks, json, fresh_profile, current_user);
    return;
  }

  await run_check(checks, "tool_inventory", async () => {
    const result = compare_tool_inventory(metadata.tools);

    if (result.errors.length > 0) {
      throw new Error(result.errors.join(" "));
    }

    if (result.extra_server_tools.length > 0) {
      return warn(
        `Core API exposes ${result.extra_server_tools.length} tool(s) that this local package does not know yet.`,
        result,
      );
    }

    return pass("Local MCP tools match the Core API agent metadata.", result);
  });

  await run_check(checks, "scope_coverage", async () => {
    if (!current_user) {
      return skip("Skipped because /oauth/me was not available.");
    }

    const result = compare_scope_coverage(current_user, profile, metadata.tools);

    if (result.missing_scopes.length > 0) {
      return warn(
        `Profile is missing ${result.missing_scopes.length} scope(s) required by installed tools.`,
        result,
      );
    }

    return pass("Profile includes the scopes required by installed tools.", result);
  });

  finish(checks, json, fresh_profile, current_user);
}

async function run_check(checks, name, callback) {
  try {
    const result = await callback();
    checks.push({
      name,
      status: result.status,
      message: result.message,
      details: result.details,
    });
  }
  catch (error) {
    checks.push({
      name,
      status: "fail",
      message: format_error_message(error),
    });
  }
}

function finish(checks, json, loaded_profile, current_user) {
  const summary = summarize(checks);
  const ok = summary.fail === 0;
  const payload = {
    ok,
    summary,
    profile: loaded_profile
      ? {
          name: loaded_profile.name,
          base_url: loaded_profile.profile.base_url,
          client_id: loaded_profile.profile.client_id,
          customer_number: current_user?.customer_number ?? loaded_profile.profile.customer_number,
          customer_id: current_user?.customer_id,
          user_id: current_user?.user_id ?? loaded_profile.profile.user_id,
        }
      : null,
    config_path: CONFIG_PATH,
    checks,
  };

  if (json) {
    console.log(JSON.stringify(payload, null, 2));
  }
  else {
    for (const check of checks) {
      console.log(`${check.status.toUpperCase()} ${check.name}: ${check.message}`);
    }

    console.log(`Doctor completed: ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail, ${summary.skip} skip.`);
  }

  if (!ok) {
    process.exitCode = 1;
  }
}

function compare_tool_inventory(server_tools) {
  assert_unique_tool_names(server_tools, "Core API metadata");

  const remote_agent_tools = AGENT_TOOLS.filter((tool) => !tool.local_only);
  const local_by_name = new Map(remote_agent_tools.map((tool) => [tool.name, tool]));
  const server_by_name = new Map(server_tools.map((tool) => [tool.name, tool]));
  const missing_on_server = [];
  const route_mismatches = [];
  const scope_mismatches = [];

  for (const local_tool of remote_agent_tools) {
    const server_tool = server_by_name.get(local_tool.name);

    if (!server_tool) {
      missing_on_server.push(local_tool.name);
      continue;
    }

    if (server_tool.route !== local_tool.route) {
      route_mismatches.push({
        name: local_tool.name,
        local_route: local_tool.route,
        server_route: server_tool.route,
      });
    }

    if (server_tool.required_scope !== local_tool.scope) {
      scope_mismatches.push({
        name: local_tool.name,
        local_scope: local_tool.scope,
        server_scope: server_tool.required_scope,
      });
    }
  }

  const extra_server_tools = server_tools
    .map((tool) => tool.name)
    .filter((name) => name && !local_by_name.has(name));
  const errors = [];

  if (missing_on_server.length > 0) {
    errors.push(`Missing server tool metadata for: ${missing_on_server.join(", ")}.`);
  }

  if (route_mismatches.length > 0) {
    errors.push(`Route mismatches: ${route_mismatches.map((item) => `${item.name} local=${item.local_route} server=${item.server_route}`).join("; ")}.`);
  }

  if (scope_mismatches.length > 0) {
    errors.push(`Scope mismatches: ${scope_mismatches.map((item) => `${item.name} local=${item.local_scope} server=${item.server_scope}`).join("; ")}.`);
  }

  return {
    local_tool_count: AGENT_TOOLS.length,
    remote_tool_count: remote_agent_tools.length,
    server_tool_count: server_tools.length,
    missing_on_server,
    extra_server_tools,
    route_mismatches,
    scope_mismatches,
    errors,
  };
}

function compare_scope_coverage(current_user, profile, server_tools) {
  const granted_scopes = new Set([
    ...(current_user.scopes || []),
    ...(profile.scope || []),
  ]);
  const required_scopes = Array.from(new Set(server_tools
    .map((tool) => tool.required_scope)
    .filter(Boolean)));
  const missing_scopes = required_scopes.filter((scope) => !granted_scopes.has(scope));
  const affected_tools = server_tools
    .filter((tool) => missing_scopes.includes(tool.required_scope))
    .map((tool) => tool.name);

  return {
    granted_scopes: Array.from(granted_scopes).sort(),
    required_scopes: required_scopes.sort(),
    missing_scopes,
    affected_tools,
  };
}

function assert_unique_tool_names(tools, label) {
  const seen = new Set();
  const duplicates = [];

  for (const tool of tools) {
    const name = tool?.name;

    if (!name) {
      duplicates.push("<missing>");
      continue;
    }

    if (seen.has(name)) {
      duplicates.push(name);
      continue;
    }

    seen.add(name);
  }

  if (duplicates.length > 0) {
    throw new Error(`${label} has duplicate or missing tool names: ${duplicates.join(", ")}.`);
  }
}

function summarize(checks) {
  return {
    pass: checks.filter((check) => check.status === "pass").length,
    warn: checks.filter((check) => check.status === "warn").length,
    fail: checks.filter((check) => check.status === "fail").length,
    skip: checks.filter((check) => check.status === "skip").length,
  };
}

function add_skip(checks, name, message) {
  checks.push({
    name,
    status: "skip",
    message,
  });
}

function pass(message, details = undefined) {
  return {
    status: "pass",
    message,
    details,
  };
}

function warn(message, details = undefined) {
  return {
    status: "warn",
    message,
    details,
  };
}

function skip(message, details = undefined) {
  return {
    status: "skip",
    message,
    details,
  };
}
