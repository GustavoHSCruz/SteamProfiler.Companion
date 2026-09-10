import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (manifest.manifest_version !== 3) throw new Error("manifest must use version 3");
if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error("invalid extension version");
if (manifest.version !== packageJson.version) throw new Error("manifest and package versions differ");
if (JSON.stringify(manifest.permissions.sort()) !== JSON.stringify(["activeTab", "storage"]))
  throw new Error("unexpected extension permission");
if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(["https://steamprofiler.org/api/*"]))
  throw new Error("unexpected host permission");

const required = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_ui.page,
  ...Object.values(manifest.icons),
  ...manifest.content_scripts.flatMap((entry) => [...entry.js, ...entry.css]),
];
for (const file of required) {
  if (!statSync(join(root, file)).isFile()) throw new Error(`missing manifest file: ${file}`);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const files = walk(root).filter((path) => !path.includes(`${join(root, ".git")}`)
  && !path.includes(`${join(root, "dist")}`));
for (const file of files.filter((path) => path.endsWith(".json"))) {
  JSON.parse(readFileSync(file, "utf8"));
}

const defaultMessages = JSON.parse(readFileSync(join(root, "_locales/en/messages.json"), "utf8"));
const messageKeys = Object.keys(defaultMessages).sort();
for (const locale of ["pt_BR", "ru"]) {
  const messages = JSON.parse(readFileSync(join(root, `_locales/${locale}/messages.json`), "utf8"));
  if (JSON.stringify(Object.keys(messages).sort()) !== JSON.stringify(messageKeys))
    throw new Error(`${locale} locale does not have exact key parity with English`);
}
for (const file of files.filter((path) => path.endsWith(".js") || path.endsWith(".mjs"))) {
  const check = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (check.status !== 0) throw new Error(`${relative(root, file)}\n${check.stderr}`);
}

const shipped = files.filter((path) => /\.(?:js|html)$/.test(path));
for (const file of shipped) {
  const source = readFileSync(file, "utf8");
  if (/<script[^>]+src=["']https?:/i.test(source)) throw new Error(`remote script in ${relative(root, file)}`);
  if (/\beval\s*\(|new Function\s*\(/.test(source)) throw new Error(`dynamic code in ${relative(root, file)}`);
}

const uiSource = shipped.map((file) => readFileSync(file, "utf8")).join("\n");
const referencedMessages = new Set([
  ...uiSource.matchAll(/\bt\(["']([A-Za-z0-9_]+)["']/g),
  ...uiSource.matchAll(/data-i18n=["']([A-Za-z0-9_]+)["']/g),
].map((match) => match[1]));
for (const key of referencedMessages) {
  if (!defaultMessages[key]) throw new Error(`missing English message: ${key}`);
}

console.log(`check: manifest and ${files.length} source files are valid`);
