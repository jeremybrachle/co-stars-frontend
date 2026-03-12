import { spawn } from "node:child_process";

const checks = [
  { label: "Lint", command: "run", args: ["lint"] },
  { label: "Typecheck", command: "run", args: ["typecheck"] },
  { label: "Unit tests", command: "run", args: ["test:unit"] },
];

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runCheck(check) {
  return new Promise((resolve) => {
    const child = spawn(getNpmCommand(), [check.command, ...check.args], {
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => {
      resolve({
        label: check.label,
        passed: code === 0,
        exitCode: code ?? 1,
      });
    });

    child.on("error", () => {
      resolve({
        label: check.label,
        passed: false,
        exitCode: 1,
      });
    });
  });
}

async function main() {
  const results = [];

  for (const check of checks) {
    const result = await runCheck(check);
    results.push(result);

    if (!result.passed) {
      break;
    }
  }

  const passedCount = results.filter((result) => result.passed).length;
  const percentage = Math.round((passedCount / checks.length) * 100);

  console.log("\nTest summary");
  console.log(`Passed ${passedCount}/${checks.length} checks (${percentage}%)`);

  for (const check of checks) {
    const result = results.find((entry) => entry.label === check.label);
    const status = result ? (result.passed ? "PASS" : "FAIL") : "SKIP";
    console.log(`- ${check.label}: ${status}`);
  }

  if (passedCount !== checks.length) {
    process.exit(1);
  }
}

main().catch(() => {
  process.exit(1);
});