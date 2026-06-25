import { promises as fs } from "node:fs";
import path from "node:path";

import { option_bool, option_bool_if_present, option_value } from "./args.mjs";
import { load_fresh_profile_by_name } from "./auth.mjs";
import { post_agent_json, post_agent_read_json, request_agent_json } from "./http.mjs";
import {
  is_plain_object,
  JsonRpcError,
  optional_boolean,
  optional_integer,
  optional_string,
  required_string,
} from "./json-rpc.mjs";

const MODEL_FORM_METADATA_SAVE_FIELDS = [
  "process_name",
  "process_description",
  "parent_folder_id",
  "global_assignment",
  "file_name_template",
  "map",
  "map_patch",
  "expected_conflict_token",
  "change_reason",
  "reverses_operation_id",
  "correlation_id",
  "source_reference",
  "audit_detail",
];

const MODEL_FORM_CREATE_FIELDS = [
  "source_model_form_id",
  "root_feature_code",
  "process_name",
  "process_description",
  "parent_folder_id",
  "global_assignment",
  "file_name_template",
  "template_name",
  "template_description",
  "map",
  "expected_conflict_token",
  "change_reason",
  "reverses_operation_id",
  "correlation_id",
  "source_reference",
  "audit_detail",
];

const MODEL_FORM_TEMPLATE_UPLOAD_FIELDS = [
  "staged_file_id",
  "expected_conflict_token",
  "change_reason",
  "reverses_operation_id",
  "correlation_id",
  "source_reference",
  "audit_detail",
];

const MODEL_FORM_TEMPLATE_STAGE_FIELDS = [
  "file_name",
  "content_type",
];

export async function search_model_forms(positionals, options) {
  const payload = await agent_search_model_forms({
    profile: option_value(options, "profile", undefined),
    root_feature_code: option_value(options, "root-feature-code", option_value(options, "root_feature_code", undefined)),
    parent_folder_id: option_value(options, "parent-folder-id", option_value(options, "parent_folder_id", undefined)),
    search_text: option_value(options, "search-text", option_value(options, "search_text", positionals[0])),
    include_inactive: option_bool_if_present(options, "include-inactive") ?? option_bool_if_present(options, "include_inactive"),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
  });

  print_model_form_payload(payload, options);
}

export async function search_model_form_folders(positionals, options) {
  const payload = await agent_search_model_form_folders({
    profile: option_value(options, "profile", undefined),
    parent_folder_id: option_value(options, "parent-folder-id", option_value(options, "parent_folder_id", positionals[0])),
    include_inactive: option_bool_if_present(options, "include-inactive") ?? option_bool_if_present(options, "include_inactive"),
    limit: option_value(options, "limit", undefined),
    cursor: option_value(options, "cursor", undefined),
  });

  print_model_form_payload(payload, options);
}

export async function get_model_form(positionals, options) {
  const payload = await agent_get_model_form({
    profile: option_value(options, "profile", undefined),
    model_form_id: option_value(options, "model-form-id", option_value(options, "model_form_id", positionals[0])),
    sections: option_value(options, "sections", undefined),
    detail_level: option_value(options, "detail-level", option_value(options, "detail_level", undefined)),
    node_id: option_value(options, "node-id", option_value(options, "node_id", undefined)),
    map_item_id: option_value(options, "map-item-id", option_value(options, "map_item_id", undefined)),
  });

  print_model_form_payload(payload, options);
}

export async function validate_create_model_form(positionals, options) {
  const request = await read_model_form_request_from_options(options);
  const expected_conflict_token = option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined));
  const payload = await agent_validate_create_model_form({
    profile: option_value(options, "profile", undefined),
    ...request,
    expected_conflict_token: expected_conflict_token || request.expected_conflict_token,
  });

  print_model_form_payload(payload, options);
}

export async function create_model_form(positionals, options) {
  const request = await read_model_form_request_from_options(options);
  const expected_conflict_token = option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined));
  const payload = await agent_create_model_form({
    profile: option_value(options, "profile", undefined),
    ...request,
    expected_conflict_token: expected_conflict_token || request.expected_conflict_token,
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", request.audit_detail)),
    approved: option_bool(options, "approved", false),
    confirm_save: option_bool(options, "confirm-save", option_bool(options, "confirm_save", false)),
  });

  print_model_form_payload(payload, options);
}

export async function validate_update_model_form(positionals, options) {
  const request = await read_model_form_request_from_options(options);
  const expected_conflict_token = option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined));
  const payload = await agent_validate_update_model_form({
    profile: option_value(options, "profile", undefined),
    model_form_id: option_value(options, "model-form-id", option_value(options, "model_form_id", positionals[0])),
    ...request,
    expected_conflict_token: expected_conflict_token || request.expected_conflict_token,
  });

  print_model_form_payload(payload, options);
}

export async function update_model_form(positionals, options) {
  const request = await read_model_form_request_from_options(options);
  const expected_conflict_token = option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined));
  const payload = await agent_update_model_form({
    profile: option_value(options, "profile", undefined),
    model_form_id: option_value(options, "model-form-id", option_value(options, "model_form_id", positionals[0])),
    ...request,
    expected_conflict_token: expected_conflict_token || request.expected_conflict_token,
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", request.audit_detail)),
    approved: option_bool(options, "approved", false),
    confirm_update: option_bool(options, "confirm-update", option_bool(options, "confirm_update", false)),
    confirm_save: option_bool(options, "confirm-save", option_bool(options, "confirm_save", false)),
  });

  print_model_form_payload(payload, options);
}

export async function download_model_form_template(positionals, options) {
  const output_path = option_value(options, "output-path", option_value(options, "output_path", undefined));
  const payload = await agent_download_model_form_template({
    profile: option_value(options, "profile", undefined),
    model_form_id: option_value(options, "model-form-id", option_value(options, "model_form_id", positionals[0])),
    output_path,
  });

  print_model_form_payload(payload, options);
}

export async function upload_model_form_template(positionals, options) {
  const request = await read_model_form_request_from_options(options);
  const expected_conflict_token = option_value(options, "expected-conflict-token", option_value(options, "expected_conflict_token", undefined));
  const payload = await agent_upload_model_form_template({
    profile: option_value(options, "profile", undefined),
    model_form_id: option_value(options, "model-form-id", option_value(options, "model_form_id", positionals[0])),
    file_path: option_value(options, "file-path", option_value(options, "file_path", undefined)),
    staged_file_id: option_value(options, "staged-file-id", option_value(options, "staged_file_id", request.staged_file_id)),
    file_name: option_value(options, "file-name", option_value(options, "file_name", request.file_name)),
    content_type: option_value(options, "content-type", option_value(options, "content_type", request.content_type)),
    ...request,
    expected_conflict_token: expected_conflict_token || request.expected_conflict_token,
    audit_detail: option_value(options, "audit-detail", option_value(options, "audit_detail", request.audit_detail)),
    approved: option_bool(options, "approved", false),
    confirm_update: option_bool(options, "confirm-update", option_bool(options, "confirm_update", false)),
    confirm_save: option_bool(options, "confirm-save", option_bool(options, "confirm_save", false)),
  });

  print_model_form_payload(payload, options);
}

export async function stage_model_form_template_file(positionals, options) {
  const approved = option_bool(options, "approved", false)
    || option_bool(options, "confirm-upload", option_bool(options, "confirm_upload", false));
  if (!approved) {
    throw new JsonRpcError(-32602, "stage_model_form_template_file requires approved=true after explicit user approval.");
  }

  const request = await read_model_form_request_from_options(options);
  const payload = await agent_stage_model_form_template_file({
    profile: option_value(options, "profile", undefined),
    model_form_id: option_value(options, "model-form-id", option_value(options, "model_form_id", positionals[0])),
    file_path: option_value(options, "file-path", option_value(options, "file_path", undefined)),
    file_name: option_value(options, "file-name", option_value(options, "file_name", request.file_name)),
    content_type: option_value(options, "content-type", option_value(options, "content_type", request.content_type)),
    ...request,
    approved,
    confirm_upload: option_bool(options, "confirm-upload", option_bool(options, "confirm_upload", false)),
  });

  print_model_form_payload(payload, options);
}

export async function agent_search_model_forms(input) {
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, "/agent/model-forms/configurations/search", {
    root_feature_code: optional_string(input, "root_feature_code"),
    parent_folder_id: optional_string(input, "parent_folder_id"),
    search_text: optional_string(input, "search_text"),
    include_inactive: optional_boolean(input, "include_inactive"),
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
  });
}

export async function agent_search_model_form_folders(input) {
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, "/agent/model-forms/folders/search", {
    parent_folder_id: optional_string(input, "parent_folder_id"),
    include_inactive: optional_boolean(input, "include_inactive"),
    limit: optional_integer(input, "limit"),
    cursor: optional_string(input, "cursor"),
  });
}

export async function agent_get_model_form(input) {
  const model_form_id = required_string(input, "model_form_id", "get_model_form requires model_form_id.");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await request_agent_json(profile, `/agent/model-forms/configurations/${encodeURIComponent(model_form_id)}`, {
    sections: optional_string(input, "sections"),
    detail_level: optional_string(input, "detail_level"),
    node_id: optional_string(input, "node_id"),
    map_item_id: optional_string(input, "map_item_id"),
  });
}

export async function agent_validate_create_model_form(input) {
  const request = resolve_model_form_create_request(input);

  if (!request.process_name) {
    throw new JsonRpcError(-32602, "validate_create_model_form requires process_name.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, "/agent/model-forms/configurations/validate-create", request);
}

export async function agent_create_model_form(input) {
  const request = resolve_model_form_create_request(input);
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_save") || false;

  if (!request.process_name) {
    throw new JsonRpcError(-32602, "create_model_form requires process_name.");
  }

  if (!approved) {
    throw new JsonRpcError(-32602, "create_model_form requires approved=true after explicit user approval.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_json(profile, "/agent/model-forms/configurations", {
    ...request,
    approved: true,
    confirm_save: optional_boolean(input, "confirm_save") === true,
  });
}

export async function agent_validate_update_model_form(input) {
  const model_form_id = required_string(input, "model_form_id", "validate_update_model_form requires model_form_id.");
  const request = resolve_model_form_metadata_save_request(input);

  if (!request.expected_conflict_token) {
    throw new JsonRpcError(-32602, "validate_update_model_form requires expected_conflict_token from get_model_form.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_read_json(profile, `/agent/model-forms/configurations/${encodeURIComponent(model_form_id)}/validate-update`, request);
}

export async function agent_update_model_form(input) {
  const model_form_id = required_string(input, "model_form_id", "update_model_form requires model_form_id.");
  const request = resolve_model_form_metadata_save_request(input);
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_update") || optional_boolean(input, "confirm_save") || false;

  if (!request.expected_conflict_token) {
    throw new JsonRpcError(-32602, "update_model_form requires expected_conflict_token from get_model_form.");
  }

  if (!approved) {
    throw new JsonRpcError(-32602, "update_model_form requires approved=true after explicit user approval.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_json(profile, `/agent/model-forms/configurations/${encodeURIComponent(model_form_id)}`, {
    ...request,
    approved: true,
    confirm_update: optional_boolean(input, "confirm_update") === true,
    confirm_save: optional_boolean(input, "confirm_save") === true,
  });
}

export async function agent_download_model_form_template(input) {
  const model_form_id = required_string(input, "model_form_id", "download_model_form_template requires model_form_id.");
  const output_path = optional_string(input, "output_path");
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));
  const payload = await request_agent_json(profile, `/agent/model-forms/configurations/${encodeURIComponent(model_form_id)}/template-file`);

  if (output_path) {
    const item = first_payload_item(payload);
    if (!item?.download_url) {
      throw new JsonRpcError(-32603, "Template download did not return download_url.");
    }

    const resolved_path = path.resolve(output_path);
    await fs.mkdir(path.dirname(resolved_path), { recursive: true });
    await download_signed_file(profile, item.download_url, resolved_path);
    item.local_file_path = resolved_path;
  }

  return payload;
}

export async function agent_upload_model_form_template(input) {
  const model_form_id = required_string(input, "model_form_id", "upload_model_form_template requires model_form_id.");
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_update") || optional_boolean(input, "confirm_save") || false;

  if (!approved) {
    throw new JsonRpcError(-32602, "upload_model_form_template requires approved=true after explicit user approval.");
  }

  const request = await resolve_model_form_template_upload_request(input, model_form_id);

  if (!request.expected_conflict_token) {
    throw new JsonRpcError(-32602, "upload_model_form_template requires expected_conflict_token from get_model_form.");
  }

  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  return await post_agent_json(profile, `/agent/model-forms/configurations/${encodeURIComponent(model_form_id)}/template-file`, {
    ...request,
    approved: true,
    confirm_update: optional_boolean(input, "confirm_update") === true,
    confirm_save: optional_boolean(input, "confirm_save") === true,
  }, {
    timeout_ms: 120000,
  });
}

export async function agent_stage_model_form_template_file(input) {
  const model_form_id = required_string(input, "model_form_id", "stage_model_form_template_file requires model_form_id.");
  const approved = optional_boolean(input, "approved") || optional_boolean(input, "confirm_upload") || false;

  if (!approved) {
    throw new JsonRpcError(-32602, "stage_model_form_template_file requires approved=true after explicit user approval.");
  }

  const request = await resolve_model_form_template_stage_request(input);
  const { profile } = await load_fresh_profile_by_name(optional_string(input, "profile"));

  const payload = await post_agent_json(profile, `/agent/model-forms/configurations/${encodeURIComponent(model_form_id)}/template-file/stage`, {
    ...request,
    approved: true,
    confirm_upload: optional_boolean(input, "confirm_upload") === true,
  }, {
    timeout_ms: 120000,
  });

  const file_path = optional_string(input, "file_path");
  if (!file_path) return payload;

  const item = first_payload_item(payload);
  if (!item?.upload_url || !item?.staged_file_id) {
    throw new JsonRpcError(-32603, "stage_model_form_template_file did not return upload_url and staged_file_id.");
  }

  const upload_result = await upload_file_to_signed_url(profile, item.upload_url, file_path, request.content_type);
  Object.assign(item, upload_result);
  delete item.upload_url;

  return payload;
}

async function read_model_form_request_from_options(options) {
  const request_file = option_value(options, "request-file", option_value(options, "request_file", undefined));
  const request_json = option_value(options, "request-json", option_value(options, "request_json", undefined));

  if (request_file) {
    const text = await fs.readFile(request_file, "utf8");

    return parse_json_object(text, "request_file");
  }

  if (request_json) {
    return parse_json_object(request_json, "request_json");
  }

  return {};
}

function resolve_model_form_metadata_save_request(input) {
  if (!is_plain_object(input)) return {};

  if (input.request !== undefined) {
    if (!is_plain_object(input.request)) {
      throw new JsonRpcError(-32602, "request must be an object.");
    }

    return { ...input.request };
  }

  const request_json = optional_string(input, "request_json");
  if (request_json) return parse_json_object(request_json, "request_json");

  const request = {};

  for (const field of MODEL_FORM_METADATA_SAVE_FIELDS) {
    if (input[field] !== undefined) request[field] = input[field];
  }

  return request;
}

function resolve_model_form_create_request(input) {
  if (!is_plain_object(input)) return {};

  if (input.request !== undefined) {
    if (!is_plain_object(input.request)) {
      throw new JsonRpcError(-32602, "request must be an object.");
    }

    return { ...input.request };
  }

  const request_json = optional_string(input, "request_json");
  if (request_json) return parse_json_object(request_json, "request_json");

  const request = {};

  for (const field of MODEL_FORM_CREATE_FIELDS) {
    if (input[field] !== undefined) request[field] = input[field];
  }

  return request;
}

async function resolve_model_form_template_upload_request(input, model_form_id) {
  if (!is_plain_object(input)) return {};

  let request = {};
  if (input.request !== undefined) {
    if (!is_plain_object(input.request)) {
      throw new JsonRpcError(-32602, "request must be an object.");
    }

    request = { ...input.request };
  }
  else {
    const request_json = optional_string(input, "request_json");
    request = request_json ? parse_json_object(request_json, "request_json") : {};

    for (const field of MODEL_FORM_TEMPLATE_UPLOAD_FIELDS) {
      if (input[field] !== undefined) request[field] = input[field];
    }
  }

  if (input.content_base64 !== undefined || request.content_base64 !== undefined) {
    throw new JsonRpcError(-32602, "upload_model_form_template no longer accepts content_base64. Use file_path locally or staged_file_id from stage_model_form_template_file.");
  }

  const file_path = optional_string(input, "file_path");
  if (file_path) {
    const stage_payload = await agent_stage_model_form_template_file({
      profile: optional_string(input, "profile"),
      model_form_id,
      file_path,
      file_name: request.file_name || optional_string(input, "file_name"),
      content_type: request.content_type || optional_string(input, "content_type"),
      approved: true,
    });
    const stage_item = first_payload_item(stage_payload);

    if (!stage_item?.staged_file_id) {
      throw new JsonRpcError(-32603, "stage_model_form_template_file did not return staged_file_id.");
    }

    request.staged_file_id = stage_item.staged_file_id;
  }

  if (!request.staged_file_id) {
    throw new JsonRpcError(-32602, "upload_model_form_template requires staged_file_id or file_path.");
  }

  delete request.file_name;
  delete request.content_type;
  delete request.content_base64;

  return request;
}

async function resolve_model_form_template_stage_request(input) {
  if (!is_plain_object(input)) return {};

  let request = {};
  if (input.request !== undefined) {
    if (!is_plain_object(input.request)) {
      throw new JsonRpcError(-32602, "request must be an object.");
    }

    request = { ...input.request };
  }
  else {
    const request_json = optional_string(input, "request_json");
    request = request_json ? parse_json_object(request_json, "request_json") : {};

    for (const field of MODEL_FORM_TEMPLATE_STAGE_FIELDS) {
      if (input[field] !== undefined) request[field] = input[field];
    }
  }

  if (input.content_base64 !== undefined || request.content_base64 !== undefined) {
    throw new JsonRpcError(-32602, "stage_model_form_template_file no longer accepts content_base64. Use file_path locally, or create the stage session and upload to the returned upload_url.");
  }

  const file_path = optional_string(input, "file_path");
  if (file_path) {
    const resolved_path = path.resolve(file_path);
    request.file_name ||= path.basename(resolved_path);
    request.content_type ||= content_type_for_file_name(request.file_name);
  }

  if (!request.file_name) {
    throw new JsonRpcError(-32602, "stage_model_form_template_file requires file_name or file_path.");
  }

  return request;
}

async function download_signed_file(profile, download_url, output_path) {
  const response = await fetch(resolve_transfer_url(profile, download_url));
  if (!response.ok) {
    throw await transfer_error(response, "Template download failed");
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(output_path, bytes);
}

async function upload_file_to_signed_url(profile, upload_url, file_path, content_type) {
  const resolved_path = path.resolve(file_path);
  const file_name = path.basename(resolved_path);
  const bytes = await fs.readFile(resolved_path);
  const form = new FormData();
  form.set("file", new Blob([bytes], { type: content_type || content_type_for_file_name(file_name) }), file_name);

  const response = await fetch(resolve_transfer_url(profile, upload_url), {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw await transfer_error(response, "Template upload failed");
  }

  return await parse_transfer_response(response);
}

function resolve_transfer_url(profile, transfer_url) {
  return new URL(transfer_url, profile.base_url).toString();
}

async function transfer_error(response, fallback) {
  const payload = await parse_transfer_response(response);
  const message = payload?.Message || payload?.message || payload?.error_description || payload?.error || response.statusText || fallback;

  return new JsonRpcError(-32603, `${fallback}: ${message}`);
}

async function parse_transfer_response(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  }
  catch {
    return { text };
  }
}

function content_type_for_file_name(file_name) {
  const lower = String(file_name || "").toLowerCase();
  if (lower.endsWith(".xlsm")) return "application/vnd.ms-excel.sheet.macroEnabled.12";
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

function first_payload_item(payload) {
  return Array.isArray(payload?.items) && payload.items.length > 0 ? payload.items[0] : null;
}

function parse_json_object(text, label) {
  try {
    const value = JSON.parse(text);

    if (!is_plain_object(value)) {
      throw new JsonRpcError(-32602, `${label} must be a JSON object.`);
    }

    return value;
  }
  catch (error) {
    if (error instanceof JsonRpcError) throw error;
    throw new JsonRpcError(-32602, `Invalid JSON in ${label}: ${error.message}`);
  }
}

function print_model_form_payload(payload, options) {
  if (!option_bool(options, "table", false)) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const items = payload.items || [];

  if (items.length === 0) {
    console.log("No model form records returned.");
    return;
  }

  const first = items[0];

  if (first.model_form) {
    console.log("model_form_id\tprocess_name\troot_feature_code\tactive\tmap_nodes\tmap_items\tconflict_token\tsections");

    for (const item of items) {
      const model_form = item.model_form || {};
      console.log([
        model_form.model_form_id || item.model_form_id || "",
        model_form.process_name || "",
        model_form.root_feature_code || "",
        model_form.active ?? "",
        model_form.map_node_count ?? "",
        model_form.map_item_count ?? "",
        model_form.conflict_token || "",
        (item.sections || []).join(","),
      ].join("\t"));
    }

    print_payload_footer(payload);
    return;
  }

  if (first.model_form_id && first.process_name !== undefined) {
    console.log("model_form_id\tprocess_name\troot_feature_code\tactive\tmap_nodes\tmap_items\tconflict_token");

    for (const item of items) {
      console.log([
        item.model_form_id || "",
        item.process_name || "",
        item.root_feature_code || "",
        item.active ?? "",
        item.map_node_count ?? "",
        item.map_item_count ?? "",
        item.conflict_token || "",
      ].join("\t"));
    }

    print_payload_footer(payload);
    return;
  }

  console.log(JSON.stringify(payload, null, 2));
}

function print_payload_footer(payload) {
  if (payload.next_cursor) console.log(`next_cursor\t${payload.next_cursor}`);
  if (payload.is_truncated) console.log("is_truncated\ttrue");
}
