import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Every `/api/...` path the frontend calls must resolve to a real route
 * handler.
 *
 * This exists because two clients kept calling the .NET paths long after the
 * routes were ported — `/api/Questionnaries` (the original typo, since fixed
 * to `questionnaires`) and `/api/patients/getWithAll/{id}` (now
 * `?include=all`). Nothing caught it: the paths are template literals, so
 * TypeScript sees only strings, and the failure surfaces as a 404 at runtime
 * on whichever screen the user happens to open.
 */

const root = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** `/api/patients/[id]/links` → `/api/patients/:/links` */
function normalise(routePath: string): string {
  return routePath
    .split("/")
    .map((segment) => (segment.startsWith("[") ? ":" : segment))
    .join("/");
}

function routePaths(): Set<string> {
  const apiDir = path.join(root, "app", "api");
  return new Set(
    walk(apiDir)
      .filter((file) => file.endsWith(`route.ts`))
      .map((file) =>
        path
          .relative(path.join(root, "app"), file)
          .replaceAll("\\", "/")
          .replace(/\/route\.ts$/, ""),
      )
      .map((routePath) => normalise("/" + routePath)),
  );
}

function clientFiles(): string[] {
  return [
    ...walk(path.join(root, "features")),
    path.join(root, "lib", "apiClient.ts"),
  ].filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));
}

/**
 * Pulls `/api/...` out of template literals and plain strings, collapsing any
 * `${...}` interpolation into a single dynamic segment.
 */
function calledPaths(source: string): string[] {
  const found = new Set<string>();

  for (const match of source.matchAll(/[`'"](\/api\/[^`'"]*)[`'"]/g)) {
    const raw = match[1]
      .split("?")[0]
      .replace(/\$\{[^}]*\}/g, ":")
      .replace(/\/+$/, "");
    found.add(raw);
  }

  return [...found];
}

describe("frontend API paths", () => {
  const routes = routePaths();

  it("finds the route handlers", () => {
    expect(routes.size).toBeGreaterThan(10);
    expect(routes.has("/api/questionnaires")).toBe(true);
  });

  it("every path the clients call resolves to a route handler", () => {
    const broken: string[] = [];

    for (const file of clientFiles()) {
      const source = readFileSync(file, "utf8");
      for (const called of calledPaths(source)) {
        if (!routes.has(called)) {
          broken.push(`${path.relative(root, file).replaceAll("\\", "/")} → ${called}`);
        }
      }
    }

    expect(broken).toEqual([]);
  });
});
