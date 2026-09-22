import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, normalize, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const ignored = new Set([".git", "node_modules", "dist"]);
const textExtensions = new Set([".md", ".ts", ".mjs", ".sql", ".yml", ".yaml", ".conf", ".json"]);
const allFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (ignored.has(entry)) continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else allFiles.push(path);
  }
}

walk(root);
const textFiles = allFiles.filter(
  (file) =>
    textExtensions.has(extname(file)) || basename(file) === "README.md" || basename(file) === "Dockerfile",
);
const failures = [];

const privateAddressPatterns = [
  /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
  /\b(?:fc|fd)[0-9a-f]{2}(?::[0-9a-f]{0,4}){2,7}\b/gi,
];
const internalHostname = /\b[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.(?:local|internal|lan|corp)\b/gi;
const emailAddress = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const publicUrl = /https?:\/\/([a-z0-9.-]+)/gi;
const allowedUrlHosts = new Set(["127.0.0.1", "api", "github.com", "localhost", "web"]);
const credentialSignatures = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}\b/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /(?:password|secret|token)\s*[=:]\s*["'][^"']{8,}["']/i,
];
const dangerousNames = [
  /^\.env(?:\..+)?$/i,
  /^(?:id_rsa|id_dsa|id_ecdsa|id_ed25519|known_hosts)$/i,
  /\.(?:pem|key|p12|pfx|kdbx|dump|backup|bak|zip|7z|tar|tgz|gz)$/i,
];

for (const file of allFiles) {
  const display = relative(root, file);
  if (dangerousNames.some((pattern) => pattern.test(basename(file)))) {
    failures.push(`${display}: forbidden filename or file type`);
  }
}

for (const file of textFiles) {
  const display = relative(root, file);
  const content = readFileSync(file, "utf8");

  if (/[\u0400-\u04ff]/u.test(content)) {
    failures.push(`${display}: untranslated Cyrillic text`);
  }

  for (const pattern of privateAddressPatterns) {
    const matches = [...content.matchAll(pattern)].map((match) => match[0]);
    if (matches.length) failures.push(`${display}: private address detected: ${matches.join(", ")}`);
  }
  const hostnames = [...content.matchAll(internalHostname)].map((match) => match[0]);
  if (hostnames.length) failures.push(`${display}: internal hostname detected: ${hostnames.join(", ")}`);
  const emails = [...content.matchAll(emailAddress)].map((match) => match[0]);
  if (emails.length) failures.push(`${display}: email address detected: ${emails.join(", ")}`);
  if (basename(file) !== "package-lock.json") {
    const unknownHosts = [...content.matchAll(publicUrl)]
      .map((match) => match[1])
      .filter((hostname) => !allowedUrlHosts.has(hostname));
    if (unknownHosts.length) {
      failures.push(`${display}: URL host outside allowlist: ${[...new Set(unknownHosts)].join(", ")}`);
    }
  }
  for (const signature of credentialSignatures) {
    if (signature.test(content)) failures.push(`${display}: possible credential signature`);
  }

  if (extname(file) !== ".md") continue;
  const mermaidOpenings = [...content.matchAll(/^```mermaid\s*$/gm)];
  for (const opening of mermaidOpenings) {
    const remaining = content.slice((opening.index ?? 0) + opening[0].length);
    const closing = remaining.match(/^```\s*$/m);
    if (!closing || !remaining.slice(0, closing.index).trim()) {
      failures.push(`${display}: empty or unclosed Mermaid block`);
    }
  }
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(?:https?:|mailto:)/.test(target)) continue;
    const resolved = normalize(resolve(dirname(file), target));
    if (!resolved.startsWith(`${root}/`) || !existsSync(resolved)) {
      failures.push(`${display}: broken relative link: ${match[1]}`);
    }
  }
}

const requiredRootFiles = ["README.md", "ABOUT.md", "STACK.md", "SECURITY.md", "SOURCE-MAP.md"];
for (const path of requiredRootFiles) {
  if (!existsSync(join(root, path))) failures.push(`required file missing: ${path}`);
}

const caseRoot = join(root, "cases");
const requiredSections = [
  "## Problem",
  "## Constraints",
  "## Architecture and approach",
  "## My implementation",
  "## Key engineering decisions",
  "## Reliability, security and testing",
  "## Result",
  "## What this demonstrates",
];

for (const caseName of readdirSync(caseRoot)) {
  const readme = join(caseRoot, caseName, "README.md");
  if (!existsSync(readme)) {
    failures.push(`cases/${caseName}: README.md missing`);
    continue;
  }
  const content = readFileSync(readme, "utf8");
  if (!content.startsWith("# ")) failures.push(`${relative(root, readme)}: H1 heading missing`);
  for (const heading of requiredSections) {
    if (!content.includes(`\n${heading}\n`)) {
      failures.push(`${relative(root, readme)}: required section missing: ${heading.slice(3)}`);
    }
  }
}

const reconstructionMarker = "Sanitized reconstruction based on an implemented system.";
const sampleFiles = allFiles.filter((file) => {
  const display = relative(root, file);
  return /^(?:backend|database|frontend|mobile|devops)\//.test(display);
});
for (const file of sampleFiles) {
  if (!readFileSync(file, "utf8").includes(reconstructionMarker)) {
    failures.push(`${relative(root, file)}: missing sanitized reconstruction label`);
  }
}

const integratedMarker = "Sanitized reconstruction based on implemented systems.";
const integratedSources = allFiles.filter((file) => {
  const display = relative(root, file);
  return (
    display.startsWith("examples/reference-service/") &&
    ([".ts", ".sql", ".yaml"].includes(extname(file)) || basename(file) === "Dockerfile")
  );
});
for (const file of integratedSources) {
  if (!readFileSync(file, "utf8").includes(integratedMarker)) {
    failures.push(`${relative(root, file)}: missing standalone reconstruction label`);
  }
}

for (const file of textFiles.filter((item) => {
  const display = relative(root, item);
  return extname(item) === ".ts" && !display.startsWith("examples/reference-service/");
})) {
  const result = spawnSync(process.execPath, ["--experimental-transform-types", file], {
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  if (result.status !== 0) {
    failures.push(`${relative(root, file)}: TypeScript load/syntax error\n${result.stderr.trim()}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

const typeScriptCount = textFiles.filter((item) => extname(item) === ".ts").length;
console.log(
  `Files checked: ${allFiles.length}; text files: ${textFiles.length}; TypeScript files: ${typeScriptCount}. ` +
    "Links, Mermaid blocks, case structure, reconstruction labels and security patterns passed.",
);
