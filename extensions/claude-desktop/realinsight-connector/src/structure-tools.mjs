import { option_bool, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { post_agent_read_json } from "./http.mjs";
import {
  optional_integer,
  optional_string,
  optional_string_array,
  required_string,
  JsonRpcError,
} from "./json-rpc.mjs";

export async function get_entity_structure(positionals, options) {
  const payload = await agent_get_entity_structure({
    profile: option_value(options, "profile", undefined),
    traversal: option_value(options, "traversal", option_value(options, "type", positionals[0])),
    entity_ids: option_values(options, "entity-ids", option_values(options, "entity_ids", positionals.slice(1))),
    feature_code: option_value(options, "feature-code", option_value(options, "feature_code", undefined)),
    feature_codes: option_values(options, "feature-codes", option_values(options, "feature_codes", undefined)),
    reference_feature_code: option_value(options, "reference-feature-code", option_value(options, "reference_feature_code", undefined)),
    as_of_date: option_value(options, "as-of-date", option_value(options, "as_of_date", undefined)),
    limit: option_value(options, "limit", undefined),
  });

  print_structure_payload(payload, options);
}

export async function agent_get_entity_structure(input) {
  const traversal = required_string(input, "traversal", "get_entity_structure requires traversal.");
  const entity_ids = optional_string_array(input, "entity_ids") || [];

  if (entity_ids.length === 0) {
    throw new JsonRpcError(-32602, "get_entity_structure requires at least one entity_id.");
  }

  validate_traversal_inputs(input, traversal);

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, "/agent/entities/structure", {
    traversal,
    entity_ids,
    feature_code: optional_string(input, "feature_code"),
    feature_codes: optional_string_array(input, "feature_codes"),
    reference_feature_code: optional_string(input, "reference_feature_code"),
    as_of_date: optional_string(input, "as_of_date"),
    limit: optional_integer(input, "limit"),
  });
}

function validate_traversal_inputs(input, traversal) {
  const normalized = traversal.trim().toLowerCase();
  const feature_code = optional_string(input, "feature_code");
  const feature_codes = optional_string_array(input, "feature_codes") || [];

  if (["children", "all_dependents_for_master", "referenced_by"].includes(normalized)
    && !feature_code
    && feature_codes.length === 0) {
    throw new JsonRpcError(-32602, `get_entity_structure traversal ${normalized} requires feature_code or feature_codes.`);
  }

  if (["periodic_current", "periodic_as_of"].includes(normalized) && !feature_code) {
    throw new JsonRpcError(-32602, `get_entity_structure traversal ${normalized} requires feature_code.`);
  }

  if (normalized === "periodic_as_of" && !optional_string(input, "as_of_date")) {
    throw new JsonRpcError(-32602, "get_entity_structure traversal periodic_as_of requires as_of_date.");
  }

  if (normalized === "references" && !optional_string(input, "reference_feature_code")) {
    throw new JsonRpcError(-32602, "get_entity_structure traversal references requires reference_feature_code.");
  }
}

function print_structure_payload(payload, options) {
  if (option_bool(options, "table", false)) {
    print_structure_table(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

function print_structure_table(payload) {
  const graph = payload.items?.[0];

  if (!graph) {
    console.log("No structure found.");
    return;
  }

  console.log("node_entity_id\tfeature_code\tparent_id\tmaster_id");

  for (const node of graph.nodes || []) {
    console.log([
      node.entity_id || "",
      node.feature_code || "",
      node.parent_id || "",
      node.master_id || "",
    ].join("\t"));
  }

  console.log("edge_from\tedge_to\trelationship\tfeature_code");

  for (const edge of graph.edges || []) {
    console.log([
      edge.from_entity_id || "",
      edge.to_entity_id || "",
      edge.relationship || "",
      edge.feature_code || "",
    ].join("\t"));
  }

  const details = [];

  if (payload.is_truncated) details.push("truncated=true");
  if (payload.provenance?.required_scope) details.push(`scope=${payload.provenance.required_scope}`);
  if (payload.warnings?.length) details.push(`warnings=${payload.warnings.length}`);

  if (details.length > 0) {
    console.log(`# ${details.join(" ")}`);
  }
}

function option_values(options, name, fallback) {
  const raw = option_value(options, name, undefined);
  if (!raw) return fallback;

  return compact_values(String(raw).split(","));
}

function compact_values(values) {
  const compacted = [];
  const seen = new Set();

  for (const value of values || []) {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) continue;

    seen.add(text);
    compacted.push(text);
  }

  return compacted;
}
