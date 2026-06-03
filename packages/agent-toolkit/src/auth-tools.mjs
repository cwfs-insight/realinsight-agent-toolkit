import os from "node:os";

import {
  build_profile,
  create_device_authorization,
  exchange_device_authorization,
  load_fresh_profile_by_name,
  normalize_base_url,
  open_browser,
  read_config,
  revoke_token,
  write_config,
} from "./auth.mjs";
import { format_error_message, HttpJsonError, request_json } from "./http.mjs";
import { is_plain_object, optional_boolean, optional_integer, optional_string, optional_string_array } from "./json-rpc.mjs";
import {
  CONFIG_PATH,
  DEFAULT_BASE_URL,
  DEFAULT_CLIENT_ID,
  DEFAULT_SCOPE,
} from "./tool-definitions.mjs";

const DEFAULT_AUTH_POLL_TIMEOUT_SECONDS = 300;
const DEFAULT_AUTH_POLL_INTERVAL_SECONDS = 5;
const DEFAULT_PROFILE_NAME = process.env.RI_AGENT_PROFILE || "default";

export async function agent_auth_status(input = {}) {
  const profile_name = optional_string(input, "profile");
  const config = await read_config();
  const resolved_profile_name = resolve_profile_name(config, profile_name);
  const pending_result = await try_complete_pending_authorization(config, resolved_profile_name);

  if (pending_result?.status === "connected") return pending_result;

  const profile = config.profiles?.[resolved_profile_name];

  if (!profile) {
    return {
      status: pending_result?.status || "not_connected",
      profile: resolved_profile_name,
      config_path: CONFIG_PATH,
      pending_authorization: pending_result?.pending_authorization || null,
      next_action: pending_result?.next_action || "Call connect_realinsight to open a Realinsight browser login.",
    };
  }

  try {
    const { profile: refreshed_profile } = await load_fresh_profile_by_name(resolved_profile_name);
    const current_user = await request_json(`${refreshed_profile.base_url}/oauth/me`, {
      method: "GET",
      bearer_token: refreshed_profile.access_token,
    });

    return {
      status: "connected",
      profile: resolved_profile_name,
      base_url: refreshed_profile.base_url,
      client_id: refreshed_profile.client_id,
      customer_number: current_user.customer_number,
      customer_id: current_user.customer_id,
      user_id: current_user.user_id,
      credential_type: current_user.credential_type,
      scopes: current_user.scopes || refreshed_profile.scope || [],
      expires_at_utc: current_user.expires_at_utc || refreshed_profile.expires_at_utc,
      config_path: CONFIG_PATH,
    };
  }
  catch (error) {
    return {
      status: "reauthorization_required",
      profile: resolved_profile_name,
      base_url: profile.base_url,
      client_id: profile.client_id,
      customer_number: profile.customer_number,
      user_id: profile.user_id,
      config_path: CONFIG_PATH,
      error: format_error_message(error),
      next_action: "Call connect_realinsight or request_realinsight_scopes to reconnect through browser login.",
    };
  }
}

export async function agent_connect_realinsight(input = {}) {
  return await start_pending_authorization(input, DEFAULT_SCOPE, "connect_realinsight");
}

export async function agent_request_realinsight_scopes(input = {}) {
  const requested_scope = scope_from_input(input) || DEFAULT_SCOPE;

  return await start_pending_authorization(input, requested_scope, "request_realinsight_scopes");
}

export async function agent_disconnect_realinsight(input = {}) {
  const profile_name = optional_string(input, "profile");
  const config = await read_config();
  const resolved_profile_name = resolve_profile_name(config, profile_name);
  const profile = config.profiles?.[resolved_profile_name];

  if (profile) {
    await revoke_token(profile, profile.refresh_token);
    await revoke_token(profile, profile.access_token);
    delete config.profiles[resolved_profile_name];
  }

  if (config.pending_authorizations?.[resolved_profile_name]) {
    delete config.pending_authorizations[resolved_profile_name];
  }

  if (config.active_profile === resolved_profile_name) {
    config.active_profile = Object.keys(config.profiles || {})[0] || "default";
  }

  await write_config(config);

  return {
    status: "disconnected",
    profile: resolved_profile_name,
    revoked_existing_profile: Boolean(profile),
    config_path: CONFIG_PATH,
  };
}

async function start_pending_authorization(input, default_scope, tool_name) {
  const config = await read_config();
  const profile_name = optional_string(input, "profile") || process.env.RI_AGENT_PROFILE || config.active_profile || "default";
  const existing_profile = config.profiles?.[profile_name];
  const base_url = normalize_base_url(optional_string(input, "base_url")
    || process.env.RI_AGENT_BASE_URL
    || existing_profile?.base_url
    || DEFAULT_BASE_URL);
  const client_id = optional_string(input, "client_id")
    || process.env.RI_AGENT_CLIENT_ID
    || existing_profile?.client_id
    || DEFAULT_CLIENT_ID;
  const scope = scope_from_input(input) || default_scope;
  const device_label = optional_string(input, "device_label") || `${os.hostname()} (${process.platform})`;
  const should_open_browser = optional_boolean(input, "open_browser") ?? true;
  const wait_for_approval = optional_boolean(input, "wait_for_approval") ?? true;
  const timeout_seconds = normalize_positive_integer(
    optional_integer(input, "timeout_seconds"),
    DEFAULT_AUTH_POLL_TIMEOUT_SECONDS);
  const poll_interval_seconds = normalize_positive_integer(
    optional_integer(input, "poll_interval_seconds"),
    DEFAULT_AUTH_POLL_INTERVAL_SECONDS);

  const authorization = await create_device_authorization({
    base_url,
    client_id,
    scope,
    device_label,
  });

  const expires_at_utc = new Date(Date.now() + Math.max(1, Number(authorization.expires_in || 600)) * 1000).toISOString();

  config.version = 1;
  config.active_profile = profile_name;
  config.profiles = config.profiles || {};
  config.pending_authorizations = config.pending_authorizations || {};
  config.pending_authorizations[profile_name] = {
    base_url,
    client_id,
    scope,
    device_code: authorization.device_code,
    user_code: authorization.user_code,
    verification_uri: authorization.verification_uri,
    verification_uri_complete: authorization.verification_uri_complete,
    expires_at_utc,
    created_at_utc: new Date().toISOString(),
    source_tool: tool_name,
  };

  await write_config(config);

  const browser_opened = should_open_browser
    ? open_browser(authorization.verification_uri_complete)
    : false;
  const should_wait_for_approval = wait_for_approval && browser_opened;

  const pending_response = {
    status: "authorization_pending",
    profile: profile_name,
    base_url,
    client_id,
    scope: scope.split(/\s+/).filter(Boolean),
    verification_uri: authorization.verification_uri,
    verification_uri_complete: authorization.verification_uri_complete,
    user_code: authorization.user_code,
    expires_at_utc,
    browser_opened,
    polling: should_wait_for_approval
      ? {
        interval_seconds: poll_interval_seconds,
        timeout_seconds,
      }
      : null,
    next_action: should_wait_for_approval
      ? "Approve the Realinsight browser login. This tool is waiting and will complete the profile if approval finishes before the timeout."
      : "Approve the Realinsight browser login. A later auth_status call can complete and store the profile.",
    config_path: CONFIG_PATH,
  };

  if (!should_wait_for_approval) return pending_response;

  const poll_result = await poll_for_pending_authorization(profile_name, timeout_seconds, poll_interval_seconds);

  if (poll_result.status === "connected") {
    return {
      ...poll_result,
      browser_opened,
    };
  }

  return {
    ...pending_response,
    status: poll_result.status,
    pending_authorization: poll_result.pending_authorization || redact_pending_authorization(config.pending_authorizations[profile_name]),
    warning: poll_result.warning,
    error: poll_result.error,
    next_action: poll_result.status === "authorization_pending"
      ? "Approval is still pending. A later auth_status call can finish and store the profile."
      : poll_result.next_action,
  };
}

async function poll_for_pending_authorization(profile_name, timeout_seconds, poll_interval_seconds) {
  const timeout_ms = timeout_seconds * 1000;
  const poll_interval_ms = poll_interval_seconds * 1000;
  const deadline_ms = Date.now() + timeout_ms;

  while (Date.now() < deadline_ms) {
    await sleep(Math.min(poll_interval_ms, Math.max(0, deadline_ms - Date.now())));

    const latest_config = await read_config();
    const result = await try_complete_pending_authorization(latest_config, profile_name);

    if (!result || result.status !== "authorization_pending") {
      return result || {
        status: "not_connected",
        profile: profile_name,
        next_action: "Call connect_realinsight to start a Realinsight browser login.",
      };
    }
  }

  const config = await read_config();

  return {
    status: "authorization_pending",
    profile: profile_name,
    pending_authorization: redact_pending_authorization(config.pending_authorizations?.[profile_name]),
    next_action: "Approval is still pending. A later auth_status call can finish and store the profile.",
  };
}

async function try_complete_pending_authorization(config, profile_name) {
  const pending = config.pending_authorizations?.[profile_name];
  if (!pending) return null;

  if (Date.parse(pending.expires_at_utc || "") <= Date.now()) {
    delete config.pending_authorizations[profile_name];
    await write_config(config);

    return {
      status: "reauthorization_required",
      profile: profile_name,
      pending_authorization: {
        expired: true,
        expires_at_utc: pending.expires_at_utc,
      },
      next_action: "Call connect_realinsight to start a new browser login.",
    };
  }

  try {
    const token = await exchange_device_authorization({
      base_url: pending.base_url,
      client_id: pending.client_id,
      device_code: pending.device_code,
      timeout_ms: 10000,
    });
    const profile = build_profile(pending.base_url, pending.client_id, token);

    config.version = 1;
    config.active_profile = profile_name;
    config.profiles = config.profiles || {};
    config.profiles[profile_name] = profile;
    delete config.pending_authorizations[profile_name];

    await write_config(config);

    return {
      status: "connected",
      profile: profile_name,
      base_url: profile.base_url,
      client_id: profile.client_id,
      customer_number: profile.customer_number,
      user_id: profile.user_id,
      scopes: profile.scope || [],
      expires_at_utc: profile.expires_at_utc,
      config_path: CONFIG_PATH,
    };
  }
  catch (error) {
    if (error instanceof HttpJsonError && error.error === "authorization_pending") {
      return {
        status: "authorization_pending",
        profile: profile_name,
        pending_authorization: redact_pending_authorization(pending),
        next_action: "Approve the Realinsight browser login, then call auth_status again.",
      };
    }

    if (error instanceof HttpJsonError && ["access_denied", "expired_token", "invalid_grant"].includes(error.error)) {
      delete config.pending_authorizations[profile_name];
      await write_config(config);

      return {
        status: "reauthorization_required",
        profile: profile_name,
        error: format_error_message(error),
        next_action: "Call connect_realinsight to start a new browser login.",
      };
    }

    return {
      status: "authorization_pending",
      profile: profile_name,
      pending_authorization: redact_pending_authorization(pending),
      warning: format_error_message(error),
      next_action: "Approve the Realinsight browser login, then call auth_status again.",
    };
  }
}

function resolve_profile_name(config, requested_profile_name) {
  return requested_profile_name || process.env.RI_AGENT_PROFILE || config.active_profile || Object.keys(config.profiles || {})[0] || DEFAULT_PROFILE_NAME;
}

function scope_from_input(input) {
  if (!is_plain_object(input)) return "";

  const scope = optional_string(input, "scope");
  if (scope) return scope;

  const scopes = optional_string_array(input, "scopes");
  return scopes?.join(" ") || "";
}

function redact_pending_authorization(pending) {
  if (!pending) return null;

  return {
    base_url: pending.base_url,
    client_id: pending.client_id,
    scope: String(pending.scope || "").split(/\s+/).filter(Boolean),
    user_code: pending.user_code,
    verification_uri: pending.verification_uri,
    verification_uri_complete: pending.verification_uri_complete,
    expires_at_utc: pending.expires_at_utc,
  };
}

function normalize_positive_integer(value, fallback) {
  if (!Number.isInteger(value) || value <= 0) return fallback;

  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
