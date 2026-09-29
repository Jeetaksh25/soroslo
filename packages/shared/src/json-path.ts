export interface JsonPathResult {
  found: boolean;
  value?: unknown;
}

function parseSegments(path: string): Array<string | number> {
  if (path === "$") return [];
  if (!path.startsWith("$")) {
    throw new TypeError(`JSON path must start with '$': ${path}`);
  }

  const segments: Array<string | number> = [];
  let index = 1;

  while (index < path.length) {
    if (path[index] === ".") {
      index += 1;
      const match = /^[A-Za-z_][A-Za-z0-9_-]*/.exec(path.slice(index));
      if (!match) throw new TypeError(`Invalid JSON path: ${path}`);
      segments.push(match[0]);
      index += match[0].length;
      continue;
    }

    if (path[index] === "[") {
      const match = /^\[(\d+)\]/.exec(path.slice(index));
      if (!match) throw new TypeError(`Invalid JSON path: ${path}`);
      segments.push(Number(match[1]));
      index += match[0].length;
      continue;
    }

    throw new TypeError(`Invalid JSON path: ${path}`);
  }

  return segments;
}

export function getJsonPath(root: unknown, path: string): JsonPathResult {
  let current = root;

  for (const segment of parseSegments(path)) {
    if (typeof segment === "number") {
      if (!Array.isArray(current) || segment >= current.length) {
        return { found: false };
      }
      current = current[segment];
      continue;
    }

    if (
      typeof current !== "object" ||
      current === null ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return { found: false };
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return { found: true, value: current };
}
