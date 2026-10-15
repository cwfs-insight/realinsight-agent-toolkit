import { readFile } from "node:fs/promises";

export const CONNECTION_UI_URI = "ui://realinsight/connection/v1.html";
export const MODEL_FORM_UI_URI = "ui://realinsight/model-form/v1.html";
export const MODEL_FORM_UI_META = { ui: { resourceUri: MODEL_FORM_UI_URI, visibility: ["model", "app"] } };
export const CONNECTION_UI_MIME = "text/html;profile=mcp-app";
export const CONNECTION_UI_META = {
  ui: { resourceUri: CONNECTION_UI_URI, visibility: ["model", "app"] },
  "openai/ui": { entrypoints: [{ type: "global" }, { type: "thread" }] },
};
export const CONNECTION_ICON = {
  src: "https://www.realinsight.cloud/Content/Images/Realinsight_Logo_mark.svg",
  mimeType: "image/svg+xml",
};

export function app_resource_entry(uri = CONNECTION_UI_URI) {
  return { uri, name: uri === MODEL_FORM_UI_URI ? "realinsight-model-form" : "realinsight-connection", title: uri === MODEL_FORM_UI_URI ? "Realinsight Model Form Inspector" : "Realinsight Connection", mimeType: CONNECTION_UI_MIME };
}

export async function read_app_resource(uri = CONNECTION_UI_URI) {
  return {
    ...app_resource_entry(uri),
    text: await readFile(new URL(uri === MODEL_FORM_UI_URI ? "./ui/model-form.html" : "./ui/connection.html", import.meta.url), "utf8"),
    _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } } },
  };
}
