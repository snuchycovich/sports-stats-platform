import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tsc = join(root, "node_modules", ".bin", "tsc");

const DOMAIN = "packages/domain";
const SHARED_IMPORTS = 'import "@stats/domain";\nimport "@stats/contracts";';

const cases = [
  { workspace: DOMAIN, source: 'import "react";', reject: "react" },
  { workspace: DOMAIN, source: 'import "@nestjs/common";', reject: "@nestjs/common" },
  { workspace: DOMAIN, source: 'import "@stats/web";', reject: "@stats/web" },
  {
    workspace: DOMAIN,
    source: 'import "@stats/contracts";',
    reject: "@stats/contracts",
  },
  { workspace: DOMAIN, source: 'import "node:fs";', reject: "node:fs" },
  {
    workspace: DOMAIN,
    source: "export const now = document.title;",
    reject: "document",
  },
  { workspace: "packages/contracts", source: 'import "@stats/api";', reject: "@stats/api" },
  { workspace: "packages/test-fixtures", source: 'import "@stats/web";', reject: "@stats/web" },
  { workspace: "apps/web", source: SHARED_IMPORTS },
  { workspace: "apps/api", source: SHARED_IMPORTS },
  {
    workspace: "packages/test-fixtures",
    source: SHARED_IMPORTS,
  },
];

let failures = 0;

for (const { workspace, source, reject } of cases) {
  const probe = join(root, workspace, "src", "__boundary_probe__.ts");
  const label = `${workspace}: ${source.replaceAll("\n", " ")}`;
  try {
    writeFileSync(probe, `${source}\nexport {};\n`);
    const result = spawnSync(tsc, ["-p", join(root, workspace, "tsconfig.json")], {
      encoding: "utf8",
    });
    const output = `${result.stdout}${result.stderr}`;
    const rejected =
      result.status !== 0 && output.includes("__boundary_probe__") && output.includes(reject ?? "");
    const ok = reject === undefined ? result.status === 0 : rejected;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${reject === undefined ? "accepted" : "rejected"} ${label}`,
    );
    if (!ok) {
      failures += 1;
      console.log(output.trim());
    }
  } finally {
    rmSync(probe, { force: true });
  }
}

if (failures > 0) {
  console.error(`${failures} boundary check(s) failed`);
  process.exit(1);
}
console.log("All boundary checks passed");
