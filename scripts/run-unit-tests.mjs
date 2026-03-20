import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const DIST_DIR = path.resolve(process.cwd(), ".test-dist");

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function collectTestFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectTestFiles(entryPath);
      }

      return entry.name.endsWith(".test.js") ? [entryPath] : [];
    }),
  );

  return files.flat().sort();
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });

    let stdoutBuffer = "";
    let passedTestCount = 0;
    let totalTestCount = 0;

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      stdoutBuffer += text;

      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? "";

      for (const line of lines) {
        if (/^\s*✔\s/.test(line)) {
          passedTestCount += 1;
        }

        const totalMatch = line.match(/^ℹ tests (\d+)$/u);
        if (totalMatch) {
          totalTestCount = Number(totalMatch[1]);
        }

        const passMatch = line.match(/^ℹ pass (\d+)$/u);
        if (passMatch) {
          passedTestCount = Number(passMatch[1]);
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk.toString());
    });

    child.on("exit", (code) => {
      if (/^\s*✔\s/.test(stdoutBuffer)) {
        passedTestCount += 1;
      }

      const totalMatch = stdoutBuffer.match(/^ℹ tests (\d+)$/u);
      if (totalMatch) {
        totalTestCount = Number(totalMatch[1]);
      }

      const passMatch = stdoutBuffer.match(/^ℹ pass (\d+)$/u);
      if (passMatch) {
        passedTestCount = Number(passMatch[1]);
      }

      resolve({
        exitCode: code ?? 1,
        passedTestCount,
        totalTestCount,
      });
    });
    child.on("error", () => resolve({ exitCode: 1, passedTestCount: 0, totalTestCount: 0 }));
  });
}

async function main() {
  await fs.rm(DIST_DIR, { recursive: true, force: true });

  const buildResult = await runCommand(getNpmCommand(), ["run", "test:unit:build"]);
  if (buildResult.exitCode !== 0) {
    process.exit(buildResult.exitCode);
  }

  await fs.writeFile(
    path.join(DIST_DIR, "package.json"),
    `${JSON.stringify({ type: "commonjs" }, null, 2)}\n`,
    "utf8",
  );

  const testFiles = await collectTestFiles(path.join(DIST_DIR, "tests"));
  if (testFiles.length === 0) {
    console.error("No compiled unit test files were found in .test-dist/tests.");
    process.exit(1);
  }

  const testResult = await runCommand("node", [
    "--test",
    "--test-reporter=spec",
    ...testFiles,
  ]);

  const totalTests = testResult.totalTestCount || testResult.passedTestCount;
  console.log(`\nUnit test summary: ${testResult.passedTestCount}/${totalTests} passing tests`);

  process.exit(testResult.exitCode);
}

main().catch(() => {
  process.exit(1);
});