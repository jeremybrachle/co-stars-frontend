import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);

function getArgValue(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

const baseUrl = getArgValue("--base-url", "http://localhost:8000").replace(/\/$/, "");
const manifestOutput = getArgValue("--manifest-output", "public/data/frontend-manifest.json");
const snapshotOutput = getArgValue("--snapshot-output", "public/data/frontend-snapshot.json");

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

async function writeJson(filePath, data) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return absolutePath;
}

async function main() {
  const manifestUrl = `${baseUrl}/api/export/frontend-manifest`;
  const manifest = await fetchJson(manifestUrl);

  if (!manifest.snapshot_endpoint) {
    throw new Error("Manifest did not include snapshot_endpoint.");
  }

  const snapshotUrl = `${baseUrl}${manifest.snapshot_endpoint}`;
  const snapshot = await fetchJson(snapshotUrl);

  const manifestPath = await writeJson(manifestOutput, manifest);
  const snapshotPath = await writeJson(snapshotOutput, snapshot);

  console.log(`Wrote manifest to ${manifestPath}`);
  console.log(`Wrote snapshot to ${snapshotPath}`);
  console.log(`Snapshot version: ${manifest.version}`);
  console.log(`Source updated at: ${manifest.source_updated_at}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});