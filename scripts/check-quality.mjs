import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = (name) => join(root, "node_modules", ".bin", name);

const valid = "export const answer = 42;\n";

const duplicatedStrings =
  'export const a = "duplicated-value";\nexport const b = "duplicated-value";\nexport const c = "duplicated-value";\n';

const identicalFunctions =
  "export function one(x: number) {\n  const y = x + 1;\n  const z = y * 2;\n  return z + x;\n}\n" +
  "export function two(x: number) {\n  const y = x + 1;\n  const z = y * 2;\n  return z + x;\n}\n";

const complexFunction = `export function complex(n: number) {
  if (n > 0) {
    for (let i = 0; i < n; i++) {
      if (i % 2) {
        if (i % 3) {
          if (i % 5) {
            while (n > 100) {
              if (i > 7) {
                n--;
              }
            }
          }
        }
      }
    }
  }
  for (let j = 0; j < n; j++) {
    if (j > 1) {
      if (j > 2) {
        if (j > 3) {
          if (j > 4) {
            n++;
          }
        }
      }
    }
  }
  return n;
}
`;

const nestedTernary = "export const nested = (p: boolean, q: boolean) => (p ? (q ? 1 : 2) : 3);\n";

const DOMAIN_PROBE = "packages/domain/src/__quality_probe__.ts";
const WEB_PROBE = "apps/web/src/__quality_probe__.tsx";
const API_PROBE = "apps/api/src/__quality_probe__.ts";

const cases = [
  { tool: "oxlint", file: DOMAIN_PROBE, source: valid },
  { tool: "oxlint", file: WEB_PROBE, source: valid },
  { tool: "oxlint", file: API_PROBE, source: valid },
  { tool: "oxfmt", file: DOMAIN_PROBE, source: valid },
  {
    tool: "oxlint",
    file: DOMAIN_PROBE,
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
    file: API_PROBE,
    source: "const unused = 1;\nexport {};\n",
    reject: "no-unused-vars",
  },
  {
    tool: "oxlint",
    file: WEB_PROBE,
    source:
      'import { useState } from "react";\nexport function Bad(flag: boolean) {\n  if (flag) {\n    useState(0);\n  }\n  return null;\n}\n',
    reject: "rules-of-hooks",
  },
  {
    tool: "oxfmt",
    file: DOMAIN_PROBE,
    source: "export const answer   =  42\n",
    reject: "__quality_probe__",
  },
  {
    tool: "oxlint",
    file: DOMAIN_PROBE,
    source: complexFunction,
    reject: "cognitive-complexity",
  },
  {
    tool: "oxlint",
    file: API_PROBE,
    source: duplicatedStrings,
    reject: "no-duplicate-string",
  },
  {
    tool: "oxlint",
    file: "scripts/__quality_probe__.mjs",
    source: duplicatedStrings.replaceAll("export ", ""),
    reject: "no-duplicate-string",
  },
  {
    tool: "oxlint",
    file: "packages/contracts/src/__quality_probe__.ts",
    source: identicalFunctions,
    reject: "no-identical-functions",
  },
  {
    tool: "oxlint",
    file: WEB_PROBE,
    source: nestedTernary,
    warn: "no-nested-conditional",
  },
  {
    tool: "oxlint",
    file: "packages/domain/src/__quality_probe__.test.ts",
    source: duplicatedStrings,
  },
];

function describeExpectation({ reject, warn }) {
  if (reject !== undefined) return "rejected";
  return warn !== undefined ? "warned" : "accepted";
}

let failures = 0;

for (const { tool, file, source, reject, warn } of cases) {
  const path = join(root, file);
  try {
    writeFileSync(path, source);
    const args = tool === "oxlint" ? [path] : ["--check", path];
    const result = spawnSync(bin(tool), args, { cwd: root, encoding: "utf8" });
    const output = `${result.stdout}${result.stderr}`;
    const expectReject = reject !== undefined;
    const expectWarn = warn !== undefined;
    let ok = result.status === 0;
    if (expectReject) ok = result.status !== 0 && output.includes(reject);
    if (expectWarn) ok = result.status === 0 && output.includes(warn);
    const verdict = describeExpectation({ reject, warn });
    console.log(`${ok ? "ok  " : "FAIL"} ${verdict} ${tool} ${file}`);
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
