import type { z } from "zod";

/** A validation problem at a path of the input. See docs/adr/ADR-003-runtime-schema-library.md. */
export type ContractIssue = {
  readonly path: readonly (string | number)[];
  readonly code: string;
  readonly message: string;
};

/**
 * Result of parsing external input into a domain type. It never exposes the schema library.
 * See docs/adr/ADR-003-runtime-schema-library.md, decision 3.
 */
export type ContractResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly ContractIssue[] };

const toPath = (path: readonly PropertyKey[]): readonly (string | number)[] =>
  path.map((key) => (typeof key === "symbol" ? key.toString() : key));

const toIssues = (issue: z.core.$ZodIssue): readonly ContractIssue[] => {
  const path = toPath(issue.path);
  if (issue.code === "unrecognized_keys") {
    return issue.keys.map((key) => ({
      path: [...path, key],
      code: issue.code,
      message: issue.message,
    }));
  }
  return [{ path, code: issue.code, message: issue.message }];
};

/** Maps schema library issues to contract issues; an unexpected key is reported at its own path. */
export const toContractResult = <T>(result: z.ZodSafeParseResult<T>): ContractResult<T> =>
  result.success
    ? { ok: true, value: result.data }
    : { ok: false, issues: result.error.issues.flatMap(toIssues) };
