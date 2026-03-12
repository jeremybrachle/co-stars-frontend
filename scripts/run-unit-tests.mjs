import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const DIST_DIR = path.resolve(process.cwd(), ".test-dist");

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function main() {
  await fs.rm(DIST_DIR, { recursive: true, force: true });

  const buildExitCode = await runCommand(getNpmCommand(), ["run", "test:unit:build"]);
  if (buildExitCode !== 0) {
    process.exit(buildExitCode);
  }

  await fs.writeFile(
    path.join(DIST_DIR, "package.json"),
    `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`,
    "utf8",
  );

  const testExitCode = await runCommand("node", [
    "--test",
    "--test-reporter=spec",
    path.join(DIST_DIR, "tests", "data", "localGraph.test.js"),
  ]);

  process.exit(testExitCode);
}

main().catch(() => {
  process.exit(1);
});