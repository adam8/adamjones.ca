#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(rootDir, "public", "index.html");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function parseScriptSources(html) {
  const sources = [];
  const scriptRegex = /<script\b[^>]*\bsrc=("([^"]+)"|'([^']+)')[^>]*>/gi;
  let match;

  while ((match = scriptRegex.exec(html))) {
    const rawSource = match[2] || match[3] || "";
    const source = rawSource.split("?")[0].split("#")[0].trim();

    if (!source.endsWith(".js")) {
      continue;
    }

    if (!sources.includes(source)) {
      sources.push(source);
    }
  }

  return sources;
}

function checkSyntax(filePath, displayPath) {
  const result = spawnSync(process.execPath, ["--check", filePath], {
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    const output = stderr || stdout || "Syntax check failed.";
    fail(`${displayPath}\n${output}`);
  }

  console.log(`OK   ${displayPath}`);
}

const html = readFileSync(indexPath, "utf8");
const sources = parseScriptSources(html);

if (sources.length === 0) {
  fail("No script src entries were found in public/index.html.");
}

for (const source of sources) {
  const absolutePath = path.join(rootDir, "public", source);
  checkSyntax(absolutePath, `public/${source}`);
}

console.log(`Checked ${sources.length} browser script file(s).`);
