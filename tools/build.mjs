import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const dist = join(root, "dist");
const unpacked = join(dist, `steamprofiler-companion-${manifest.version}`);
rmSync(dist, { recursive: true, force: true });
mkdirSync(unpacked, { recursive: true });
for (const entry of ["manifest.json", "src", "pages", "assets", "_locales", "LICENSE", "PRIVACY.md"]) {
  cpSync(join(root, entry), join(unpacked, entry), { recursive: true });
}

const archive = join(dist, `steamprofiler-companion-${manifest.version}.zip`);
const zip = spawnSync("zip", ["-X", "-q", "-r", archive, "."], { cwd: unpacked, encoding: "utf8" });
if (zip.status !== 0) throw new Error(zip.stderr || "zip failed");
console.log(`build: ${archive}`);
