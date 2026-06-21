#!/usr/bin/env tsx
/*
Download, edit, and upload a Realinsight model form Excel template.

This reference script intentionally uses the ri-agent CLI instead of calling
Core API directly. It downloads the workbook to disk, stages the edited file to
a temporary staged_file_id, then saves the template with that handle so the
final write call does not carry workbook bytes.

Example:
  npx tsx model_form_template_roundtrip.ts \
    --model-form-id 665000000000000000000001 \
    --workdir /tmp/ri-model-form \
    --set-cell "Input!B2=Draft value" \
    --approved

Run once without --approved to download and edit locally. After reviewing the
workbook, rerun with --approved; the script reuses the existing workbook in
--workdir unless --force-download is supplied.

Requires:
  npm install exceljs
  ri-agent auth login
*/

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ExcelJS from "exceljs";

type JsonObject = Record<string, unknown>;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function allOptions(name: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] === name && process.argv[index + 1]) {
      values.push(process.argv[index + 1]);
    }
  }
  return values;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function runRiAgent(...args: string[]): JsonObject {
  const stdout = execFileSync("ri-agent", args, { encoding: "utf8" });
  return JSON.parse(stdout);
}

function firstItem(payload: JsonObject): JsonObject {
  const items = payload.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("ri-agent returned no items");
  }
  const item = items[0];
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error("ri-agent returned an invalid item");
  }
  return item as JsonObject;
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function safeFileName(fileName: unknown, fallback: string): string {
  const text = stringField(fileName);
  if (!text) return fallback;
  const safeName = text.replaceAll("\\", "/").split("/").pop();
  return safeName || fallback;
}

function getTemplateFileName(modelFormId: string, profileArgs: string[]): string {
  const payload = runRiAgent("download-model-form-template", modelFormId, ...profileArgs);
  return safeFileName(firstItem(payload).file_name, `${modelFormId}.xlsx`);
}

function getConflictToken(modelFormId: string, profileArgs: string[]): string {
  const payload = runRiAgent("get-model-form", modelFormId, ...profileArgs);
  const token = stringField(firstItem(payload).conflict_token);
  if (!token) throw new Error("model form response did not include conflict_token");
  return token;
}

function stageTemplateFile(modelFormId: string, templatePath: string, profileArgs: string[]): string {
  const payload = runRiAgent(
    "stage-model-form-template",
    modelFormId,
    "--file-path",
    templatePath,
    "--approved",
    ...profileArgs,
  );
  const stagedFileId = stringField(firstItem(payload).staged_file_id);
  if (!stagedFileId) throw new Error("template stage response did not include staged_file_id");
  return stagedFileId;
}

function parseCellAssignment(value: string): [string, string, string] {
  const equalsIndex = value.indexOf("=");
  const bangIndex = value.indexOf("!");
  if (equalsIndex < 0 || bangIndex < 0 || bangIndex > equalsIndex) {
    throw new Error("--set-cell must look like Sheet!A1=value");
  }
  return [
    value.slice(0, bangIndex),
    value.slice(bangIndex + 1, equalsIndex),
    value.slice(equalsIndex + 1),
  ];
}

async function editWorkbook(filePath: string, assignments: string[]): Promise<void> {
  if (!filePath.toLowerCase().endsWith(".xlsx")) {
    throw new Error("This TypeScript reference script edits .xlsx only. Use the Python script for .xlsm.");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  for (const assignment of assignments) {
    const [sheetName, cell, value] = parseCellAssignment(assignment);
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) throw new Error(`Sheet not found: ${sheetName}`);
    worksheet.getCell(cell).value = value;
  }

  await workbook.xlsx.writeFile(filePath);
}

async function main(): Promise<void> {
  const modelFormId = option("--model-form-id");
  const workdir = option("--workdir");
  const profile = option("--profile");
  if (!modelFormId || !workdir) {
    throw new Error("--model-form-id and --workdir are required");
  }

  const profileArgs = profile ? ["--profile", profile] : [];
  const resolvedWorkdir = path.resolve(workdir);
  fs.mkdirSync(resolvedWorkdir, { recursive: true });
  const templatePath = path.join(resolvedWorkdir, getTemplateFileName(modelFormId, profileArgs));

  const shouldDownload = hasFlag("--force-download") || !hasFlag("--approved") || !fs.existsSync(templatePath);
  if (shouldDownload) {
    runRiAgent(
      "download-model-form-template",
      modelFormId,
      "--output-path",
      templatePath,
      ...profileArgs,
    );
  }
  else {
    console.log(`Using existing reviewed template at ${templatePath}`);
  }

  await editWorkbook(templatePath, allOptions("--set-cell"));

  const conflictToken = getConflictToken(modelFormId, profileArgs);
  if (!hasFlag("--approved")) {
    console.log(`Edited template written to ${templatePath}`);
    console.log("Review it, then rerun with --approved to upload the existing reviewed workbook.");
    return;
  }

  const stagedFileId = stageTemplateFile(modelFormId, templatePath, profileArgs);
  const payload = runRiAgent(
    "upload-model-form-template",
    modelFormId,
    "--request-json",
    JSON.stringify({ staged_file_id: stagedFileId }),
    "--expected-conflict-token",
    conflictToken,
    "--approved",
    ...profileArgs,
  );
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
