import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = (name) => join(root, "node_modules", ".bin", name);

const valid = "export const answer = 42;\n";

const cases = [
  { tool: "oxlint", file: "packages/domain/src/__quality_probe__.ts", source: valid },
  { tool: "oxlint", file: "apps/web/src/__quality_probe__.tsx", source: valid },
  { tool: "oxlint", file: "apps/api/src/__quality_probe__.ts", source: valid },
  { tool: "oxfmt", file: "packages/domain/src/__quality_probe__.ts", source: valid },
  {
    tool: "oxlint",
    file: "packages/domain/src/__quality_probe__.ts",
    source: 'import "react";\nexport {};\n',
    reject: "no-restricted-imports",
  },
  {
    tool: "oxlint",
    file: "packages/contracts/src/__quality_probe__.ts",
    source: "debugger;\nexport {};\n",
    reject: "no-debugger",
  },
  {
    tool: "oxlint",
    file: "apps/api/src/__quality_probe__.ts",
    source: "const unused = 1;\nexport {};\n",
    reject: "no-unused-vars",
  },
  {
    tool: "oxlint",
    file: "apps/web/src/__quality_probe__.tsx",
    source:
      'import { useState } from "react";\nexport function Bad(flag: boolean) {\n  if (flag) {\n    useState(0);\n  }\n  return null;\n}\n',
    reject: "rules-of-hooks",
  },
  {
    tool: "oxfmt",
    file: "packages/domain/src/__quality_probe__.ts",
    source: "export const answer   =  42\n",
    reject: "__quality_probe__",
  },
];

let failures = 0;

for (const { tool, file, source, reject } of cases) {
  const path = join(root, file);
  try {
    writeFileSync(path, source);
    const args = tool === "oxlint" ? [path] : ["--check", path];
    const result = spawnSync(bin(tool), args, { cwd: root, encoding: "utf8" });
    const output = `${result.stdout}${result.stderr}`;
    const expectReject = reject !== undefined;
    const ok = expectReject ? result.status !== 0 && output.includes(reject) : result.status === 0;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${expectReject ? "rejected" : "accepted"} ${tool} ${file}`,
    );
    if (!ok) {
      failures += 1;
      console.log(output.trim());
    }
  } finally {
    rmSync(path, { force: true });
  }
}

if (failures > 0) {
  console.error(`${failures} quality check(s) failed`);
  process.exit(1);
}
console.log("All quality checks passed");
