import { option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { request_agent_json } from "./http.mjs";
import { optional_string } from "./json-rpc.mjs";
import { WRITE_TOOLS_ENABLED } from "./tool-definitions.mjs";

export async function agent_get_connection_context(input) {
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  const result = await request_agent_json(profile, "/agent/context");
  for (const item of result.items || []) {
    item.transport = "local";
    item.switch_hint = "Use switch_profile to select a saved connection, or sign in to another customer on this server. Other environments require a connection to their own server URL.";
    item.write_tools_enabled = item.write_tools_enabled && WRITE_TOOLS_ENABLED;
  }
  return result;
}

export async function get_connection_context(positionals, options) {
  const payload = await agent_get_connection_context({ profile: option_value(options, "profile", undefined) });
  console.log(JSON.stringify(payload, null, 2));
}
