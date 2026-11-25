import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["packages/*/src/**/*.test.ts"],
          typecheck: {
            enabled: true,
            include: ["packages/*/src/**/*.test.ts"],
            tsconfig: "tsconfig.unit.json",
          },
        },
      },
      {
        test: {
          name: "api",
          environment: "node",
          include: ["apps/api/src/**/*.int.test.ts"],
        },
      },
    ],
  },
});
