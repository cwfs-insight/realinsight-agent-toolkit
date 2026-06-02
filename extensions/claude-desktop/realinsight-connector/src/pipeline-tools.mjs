import { option_bool, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { post_agent_json, request_agent_json } from "./http.mjs";
import {
  optional_boolean,
  optional_integer,
  optional_string,
  required_string,
  JsonRpcError,
} from "./json-rpc.mjs";

const PROPERTY_REQUIRED_PIPELINE_TYPES = new Set([
  "rent_roll_extract",
  "financial_extraction",
  "op_stmt_spread",
]);

export async function get_pipeline(positionals, options) {
  const payload = await agent_get_pipeline({
    profile: option_value(options, "profile", undefined),
    pipeline_id: option_value(options, "pipeline-id", option_value(options, "pipeline_id", positionals[0])),
  });

  print_pipeline_payload(payload, options);
}

export async function queue_pipeline(positionals, options) {
  const payload = await agent_queue_pipeline({
    profile: option_value(options, "profile", undefined),
    pipeline_type: option_value(options, "pipeline-type", option_value(options, "type", positionals[0])),
    doc_id: option_value(options, "doc-id", option_value(options, "document-tracking-id", positionals[1])),
    property_entity_id: option_value(options, "property-entity-id", option_value(options, "cre-master-id", undefined)),
    start_page: option_value(options, "start-page", option_value(options, "start_page", undefined)),
    end_page: option_value(options, "end-page", option_value(options, "end_page", undefined)),
    thread_id: option_value(options, "thread-id", option_value(options, "thread_id", undefined)),
    approved: option_bool(options, "approved", false),
    confirm_queue: option_bool(options, "confirm-queue", option_bool(options, "confirm_queue", false)),
    root_entity_id: option_value(options, "root-entity-id", option_value(options, "root_entity_id", undefined)),
    root_feature_code: option_value(options, "root-feature-code", option_value(options, "root_feature_code", undefined)),
    root_label: option_value(options, "root-label", option_value(options, "root_label", undefined)),
    master_entity_id: option_value(options, "master-entity-id", option_value(options, "master_entity_id", undefined)),
    master_feature_code: option_value(options, "master-feature-code", option_value(options, "master_feature_code", undefined)),
    parent_entity_id: option_value(options, "parent-entity-id", option_value(options, "parent_entity_id", undefined)),
    parent_feature_code: option_value(options, "parent-feature-code", option_value(options, "parent_feature_code", undefined)),
    as_of_date: option_value(options, "as-of-date", option_value(options, "as_of_date", undefined)),
  });

  print_pipeline_payload(payload, options);
}

export async function agent_get_pipeline(input) {
  const pipeline_id = required_string(input, "pipeline_id", "get_pipeline requires pipeline_id.");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/pipelines/${encodeURIComponent(pipeline_id)}`);
}

export async function agent_queue_pipeline(input) {
  const pipeline_type = required_string(input, "pipeline_type", "queue_pipeline requires pipeline_type.");
  const doc_id = optional_string(input, "doc_id") || optional_string(input, "document_tracking_id");
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_queue") || false;

  if (!doc_id) {
    throw new JsonRpcError(-32602, "queue_pipeline requires doc_id or document_tracking_id.");
  }

  if (!approved) {
    throw new JsonRpcError(-32602, "queue_pipeline requires approved=true after explicit user approval. Queueing a pipeline is a side effect.");
  }

  const normalized_pipeline_type = normalize_pipeline_type(pipeline_type);
  const property_entity_id = optional_string(input, "property_entity_id") || optional_string(input, "cre_master_id");

  if (PROPERTY_REQUIRED_PIPELINE_TYPES.has(normalized_pipeline_type) && !property_entity_id) {
    throw new JsonRpcError(-32602, `queue_pipeline ${normalized_pipeline_type} requires property_entity_id or cre_master_id.`);
  }

  const start_page = optional_integer(input, "start_page");
  const end_page = optional_integer(input, "end_page");

  if (normalized_pipeline_type !== "doc_extract" && (!start_page || start_page <= 0)) {
    throw new JsonRpcError(-32602, `queue_pipeline ${normalized_pipeline_type} requires start_page.`);
  }

  if (end_page !== undefined && end_page < 0) {
    throw new JsonRpcError(-32602, "queue_pipeline end_page cannot be less than 0. Use 0 to continue through the end of the document.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_json(profile, "/agent/pipelines/queue", {
    pipeline_type: normalized_pipeline_type,
    doc_id,
    property_entity_id,
    start_page,
    end_page,
    thread_id: optional_string(input, "thread_id"),
    approved: true,
    root_entity_id: optional_string(input, "root_entity_id"),
    root_feature_code: optional_string(input, "root_feature_code"),
    root_label: optional_string(input, "root_label"),
    master_entity_id: optional_string(input, "master_entity_id"),
    master_feature_code: optional_string(input, "master_feature_code"),
    parent_entity_id: optional_string(input, "parent_entity_id"),
    parent_feature_code: optional_string(input, "parent_feature_code"),
    as_of_date: optional_string(input, "as_of_date"),
  });
}

function normalize_pipeline_type(pipeline_type) {
  const normalized = pipeline_type.trim().toLowerCase();

  if (normalized === "document_extract" || normalized === "document_extraction") return "doc_extract";
  if (normalized === "rent_roll") return "rent_roll_extract";
  if (normalized === "financial_extract" || normalized === "financials_extract" || normalized === "financials_extraction") return "financial_extraction";
  if (normalized === "entity_extract") return "entity_extraction";
  if (normalized === "op_statement_spread") return "op_stmt_spread";

  return normalized;
}

function print_pipeline_payload(payload, options) {
  if (option_bool(options, "table", false)) {
    print_pipeline_table(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

function print_pipeline_table(payload) {
  const items = payload.items || [];

  if (items.length === 0) {
    console.log("No pipelines found.");
    return;
  }

  console.log("pipeline_id\tpipeline_type\tstatus\tresource_id\tcurrent_stage");

  for (const item of items) {
    console.log([
      item.pipeline_id || "",
      item.pipeline_type || "",
      item.status || "",
      item.resource_id || "",
      item.current_stage ?? "",
    ].join("\t"));
  }

  const details = [];

  if (payload.provenance?.required_scope) details.push(`scope=${payload.provenance.required_scope}`);
  if (payload.warnings?.length) details.push(`warnings=${payload.warnings.length}`);

  if (details.length > 0) {
    console.log(`# ${details.join(" ")}`);
  }
}
