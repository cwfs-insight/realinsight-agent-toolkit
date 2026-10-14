import { readFile } from "node:fs/promises";

export const CONNECTION_UI_URI = "ui://realinsight/connection/v1.html";
export const CONNECTION_UI_MIME = "text/html;profile=mcp-app";
export const CONNECTION_UI_META = {
  ui: { resourceUri: CONNECTION_UI_URI, visibility: ["model", "app"] },
  "openai/ui": { entrypoints: [{ type: "global" }, { type: "thread" }] },
};
export const CONNECTION_ICON = {
  src: "https://www.realinsight.cloud/Content/Images/Realinsight_Logo_mark.svg",
  mimeType: "image/svg+xml",
};

export function connection_resource_entry() {
  return { uri: CONNECTION_UI_URI, name: "realinsight-connection", title: "Realinsight Connection", mimeType: CONNECTION_UI_MIME };
}

export async function read_connection_resource() {
  return {
    ...connection_resource_entry(),
    text: await readFile(new URL("./ui/connection.html", import.meta.url), "utf8"),
    _meta: { ui: { prefersBorder: true, csp: { connectDomains: [], resourceDomains: [] } } },
  };
}
