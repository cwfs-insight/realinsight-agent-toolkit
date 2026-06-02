import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { option_bool, option_value } from "./args.mjs";
import { format_error_message, HttpJsonError, request_json } from "./http.mjs";
import {
  CONFIG_PATH,
  DEFAULT_BASE_URL,
  DEFAULT_CLIENT_ID,
  DEFAULT_SCOPE,
  DEVICE_GRANT_TYPE,
  REFRESH_SKEW_MS,
} from "./tool-definitions.mjs";

export async function login(options) {
  const base_url = normalize_base_url(option_value(options, "base-url", process.env.RI_AGENT_BASE_URL || DEFAULT_BASE_URL));
  const client_id = option_value(options, "client-id", process.env.RI_AGENT_CLIENT_ID || DEFAULT_CLIENT_ID);
  const profile_name = option_value(options, "profile", "default");
  const scope = option_value(options, "scope", DEFAULT_SCOPE);
  const device_label = option_value(options, "device-label", `${os.hostname()} (${process.platform})`);
  const should_open_browser = !option_bool(options, "no-browser", false);

  const authorization = await create_device_authorization({
    base_url,
    client_id,
    scope,
    device_label,
  });

  console.log(`Realinsight auth profile: ${profile_name}`);
  console.log(`Open this URL to authorize the CLI: ${authorization.verification_uri_complete}`);
  console.log(`User code: ${authorization.user_code}`);

  if (should_open_browser) {
    const opened = open_browser(authorization.verification_uri_complete);

    if (!opened) {
      console.log("Could not open a browser automatically. Use the URL above.");
    }
  }

  console.log("Waiting for authorization...");

  const expires_at_ms = Date.now() + Math.max(1, Number(authorization.expires_in || 600)) * 1000;
  let poll_delay_ms = Math.max(1, Number(authorization.interval || 5)) * 1000;

  while (Date.now() < expires_at_ms) {
    await sleep(poll_delay_ms);

    try {
      const token = await exchange_device_authorization({
        base_url,
        client_id,
        device_code: authorization.device_code,
      });

      const config = await read_config();
      const profile = build_profile(base_url, client_id, token);

      config.version = 1;
      config.active_profile = profile_name;
      config.profiles = config.profiles || {};
      config.profiles[profile_name] = profile;

      await write_config(config);

      console.log(`Authenticated as user ${profile.user_id} for customer ${profile.customer_number}.`);
      console.log(`Saved credentials to ${CONFIG_PATH}.`);
      return;
    }
    catch (error) {
      if (error instanceof HttpJsonError && error.error === "authorization_pending") {
        continue;
      }

      if (error instanceof HttpJsonError && error.error === "slow_down") {
        poll_delay_ms += 5000;
        continue;
      }

      throw error;
    }
  }

  throw new Error("Login timed out before the device authorization was approved.");
}

export async function status(options) {
  const profile_name = option_value(options, "profile", null);
  const json = option_bool(options, "json", false);
  const { config, name, profile } = await load_profile(profile_name);
  const refreshed_profile = await ensure_fresh_profile(config, name, profile);

  const current_user = await request_json(`${refreshed_profile.base_url}/oauth/me`, {
    method: "GET",
    bearer_token: refreshed_profile.access_token,
  });

  if (json) {
    console.log(JSON.stringify({
      profile: name,
      base_url: refreshed_profile.base_url,
      client_id: refreshed_profile.client_id,
      customer_number: current_user.customer_number,
      customer_id: current_user.customer_id,
      user_id: current_user.user_id,
      credential_type: current_user.credential_type,
      scopes: current_user.scopes || [],
      expires_at_utc: current_user.expires_at_utc || refreshed_profile.expires_at_utc,
      config_path: CONFIG_PATH,
    }, null, 2));
    return;
  }

  console.log(`Profile: ${name}`);
  console.log(`Base URL: ${refreshed_profile.base_url}`);
  console.log(`Client: ${refreshed_profile.client_id}`);
  console.log(`Customer: ${current_user.customer_number}`);
  console.log(`User: ${current_user.user_id}`);
  console.log(`Credential: ${current_user.credential_type}`);
  console.log(`Expires: ${current_user.expires_at_utc || refreshed_profile.expires_at_utc}`);
  console.log(`Scopes: ${(current_user.scopes || refreshed_profile.scope || []).join(" ")}`);
}

export async function logout(options) {
  const profile_name = option_value(options, "profile", null);
  const { config, name, profile } = await load_profile(profile_name);

  await revoke_token(profile, profile.refresh_token);
  await revoke_token(profile, profile.access_token);

  delete config.profiles[name];

  if (config.active_profile === name) {
    config.active_profile = Object.keys(config.profiles)[0] || "";
  }

  await write_config(config);

  console.log(`Logged out profile ${name}.`);
}

export async function list_profiles(options) {
  const json = option_bool(options, "json", false);
  const config = await read_config();
  const profiles = Object.entries(config.profiles || {}).map(([name, profile]) => ({
    name,
    active: config.active_profile === name,
    base_url: profile.base_url,
    client_id: profile.client_id,
    customer_number: profile.customer_number,
    user_id: profile.user_id,
    expires_at_utc: profile.expires_at_utc,
  }));

  if (json) {
    console.log(JSON.stringify({ profiles, config_path: CONFIG_PATH }, null, 2));
    return;
  }

  if (profiles.length === 0) {
    console.log("No Realinsight auth profiles are configured.");
    return;
  }

  for (const profile of profiles) {
    const marker = profile.active ? "*" : " ";
    console.log(`${marker} ${profile.name} ${profile.base_url} customer=${profile.customer_number} user=${profile.user_id}`);
  }
}

export async function load_fresh_profile(options) {
  const profile_name = option_value(options, "profile", null);
  return await load_fresh_profile_by_name(profile_name);
}

export async function load_fresh_profile_by_name(profile_name, request_options = {}) {
  const { config, name, profile } = await load_profile(profile_name);
  const refreshed_profile = await ensure_fresh_profile(config, name, profile, request_options);

  return {
    config,
    name,
    profile: refreshed_profile,
  };
}

export async function load_stored_profile_by_name(profile_name) {
  return await load_profile(profile_name);
}

async function ensure_fresh_profile(config, profile_name, profile, request_options = {}) {
  const expires_at_ms = Date.parse(profile.expires_at_utc || "");

  if (Number.isFinite(expires_at_ms) && expires_at_ms - Date.now() > REFRESH_SKEW_MS) {
    return profile;
  }

  if (!profile.refresh_token) {
    throw new Error(`Profile ${profile_name} does not have a refresh token. Run ri-agent auth login again.`);
  }

  const token = await request_json(`${profile.base_url}/oauth/token`, {
    method: "POST",
    body: {
      grant_type: "refresh_token",
      refresh_token: profile.refresh_token,
      client_id: profile.client_id || DEFAULT_CLIENT_ID,
    },
    timeout_ms: request_options.timeout_ms,
  });

  const refreshed_profile = build_profile(profile.base_url, profile.client_id || token.client_id || DEFAULT_CLIENT_ID, token);

  config.profiles[profile_name] = refreshed_profile;
  await write_config(config);

  return refreshed_profile;
}

export async function revoke_token(profile, token) {
  if (!token) return;

  try {
    await request_json(`${profile.base_url}/oauth/revoke`, {
      method: "POST",
      body: {
        token,
        client_id: profile.client_id || DEFAULT_CLIENT_ID,
      },
    });
  }
  catch (error) {
    console.warn(`Warning: token revoke request failed: ${format_error_message(error)}`);
  }
}

export async function create_device_authorization({ base_url, client_id, scope, device_label }) {
  return await request_json(`${base_url}/oauth/device_authorization`, {
    method: "POST",
    body: {
      client_id,
      scope,
      device_label,
    },
  });
}

export async function exchange_device_authorization({ base_url, client_id, device_code, timeout_ms }) {
  return await request_json(`${base_url}/oauth/token`, {
    method: "POST",
    body: {
      grant_type: DEVICE_GRANT_TYPE,
      device_code,
      client_id,
    },
    timeout_ms,
  });
}

export function build_profile(base_url, client_id, token) {
  return {
    base_url,
    client_id: client_id || token.client_id || DEFAULT_CLIENT_ID,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    token_type: token.token_type || "Bearer",
    expires_at_utc: new Date(Date.now() + Math.max(1, Number(token.expires_in || 3600)) * 1000).toISOString(),
    scope: String(token.scope || "").split(" ").filter(Boolean),
    customer_number: token.customer_number,
    user_id: token.user_id,
    updated_at_utc: new Date().toISOString(),
  };
}

async function load_profile(requested_profile_name) {
  const config = await read_config();
  const profiles = config.profiles || {};
  const name = requested_profile_name || config.active_profile || Object.keys(profiles)[0];

  if (!name || !profiles[name]) {
    throw new Error("No Realinsight auth profile found. Run ri-agent auth login first.");
  }

  return {
    config,
    name,
    profile: profiles[name],
  };
}

export async function read_config() {
  try {
    const text = await fs.readFile(CONFIG_PATH, "utf8");
    const config = JSON.parse(text);

    return {
      version: 1,
      active_profile: config.active_profile || "default",
      profiles: config.profiles || {},
      pending_authorizations: config.pending_authorizations || {},
    };
  }
  catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        version: 1,
        active_profile: "default",
        profiles: {},
        pending_authorizations: {},
      };
    }

    throw error;
  }
}

export async function write_config(config) {
  const dir = path.dirname(CONFIG_PATH);
  const temp_path = `${CONFIG_PATH}.${process.pid}.tmp`;

  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.writeFile(temp_path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temp_path, CONFIG_PATH);

  try {
    await fs.chmod(CONFIG_PATH, 0o600);
  }
  catch {
    // Windows may ignore POSIX permissions.
  }
}

export function normalize_base_url(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export function open_browser(url) {
  const command = process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "cmd"
      : "xdg-open";
  const args = process.platform === "win32"
    ? ["/c", "start", "", url]
    : [url];

  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });

    child.unref();
    return true;
  }
  catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
